import type { NfcJob, SpoolmanFilament, SpoolmanSpool, StationTarget } from '../../../shared/types'
import i18n from '@/i18n'
import { shouldPollAfterStart } from './nfc'
import { spoolToOpenSpool } from './spool'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/* ---------------- Manuelles Filament anlegen ---------------- */
export interface ManualFilamentInput {
  vendorName: string
  name: string
  material: string
  subtype: string
  colorHex: string
  diameter: string
  density: string
  weight: string
  spoolWeight: string
  extruderTemp: string
  bedTemp: string
  price: string
  articleNumber: string
  comment: string
}

export interface ManualFilamentResult {
  ok: boolean
  filament?: SpoolmanFilament
  error?: string
}

function numOrUndef(s: string): number | undefined {
  const t = s.trim().replace(',', '.')
  if (!t) return undefined
  const n = Number(t)
  return isFinite(n) ? n : undefined
}

// Prueft Pflichtfelder; gibt eine deutsche Fehlermeldung zurueck oder null.
export function validateManualFilament(f: ManualFilamentInput): string | null {
  if (!f.vendorName.trim()) return i18n.t('lib.needManufacturer')
  if (!f.name.trim()) return i18n.t('lib.needName')
  if (!f.material.trim()) return i18n.t('lib.needMaterial')
  const d = numOrUndef(f.diameter)
  if (d === undefined || d <= 0) return i18n.t('lib.diameterPositive')
  const dens = numOrUndef(f.density)
  if (dens === undefined || dens <= 0) return i18n.t('lib.densityPositive')
  const w = numOrUndef(f.weight)
  if (w === undefined || w <= 0) return i18n.t('lib.netWeightPositive')
  return null
}

// Legt Hersteller (nur falls neu) und Filament in Spoolman an.
// extraEncoded: bereits JSON-kodierte Extra-Feldwerte (ausser variant).
export async function createManualFilament(
  url: string,
  f: ManualFilamentInput,
  extraEncoded?: Record<string, string>
): Promise<ManualFilamentResult> {
  const err = validateManualFilament(f)
  if (err) return { ok: false, error: err }

  const ven = await window.api.spoolman.ensureVendor(url, f.vendorName)
  if (!ven.ok || ven.data === undefined) {
    return { ok: false, error: ven.error || i18n.t('lib.vendorEnsureFailed') }
  }

  await window.api.spoolman.ensureFields(url)

  const extra: Record<string, string> = { ...(extraEncoded || {}) }
  if (f.subtype.trim()) extra.variant = JSON.stringify(f.subtype.trim())

  const body: Record<string, unknown> = {
    name: f.name.trim(),
    vendor_id: ven.data,
    material: f.material.trim(),
    density: numOrUndef(f.density),
    diameter: numOrUndef(f.diameter),
    weight: numOrUndef(f.weight),
    spool_weight: numOrUndef(f.spoolWeight),
    color_hex: f.colorHex.replace('#', '').toUpperCase() || undefined,
    settings_extruder_temp: numOrUndef(f.extruderTemp),
    settings_bed_temp: numOrUndef(f.bedTemp),
    price: numOrUndef(f.price),
    article_number: f.articleNumber.trim() || undefined,
    comment: f.comment.trim() || undefined
  }
  if (Object.keys(extra).length > 0) body.extra = extra

  const res = await window.api.spoolman.createFilament(url, body)
  if (res.ok && res.data) return { ok: true, filament: res.data }
  return { ok: false, error: res.error || i18n.t('lib.createFilamentFailed') }
}

export interface TagWriteResult {
  ok: boolean
  msg: string
  uid?: string
}

// Schreibt eine Spule auf einen Tag (inkl. spool_id) und verknuepft danach
// die UID in Spoolman (card_uids) – bei anderen Spulen wird sie entfernt.
export async function writeTagForSpool(
  station: StationTarget,
  spoolmanUrl: string,
  spool: SpoolmanSpool,
  timeoutMs = 10000
): Promise<TagWriteResult> {
  const os = spoolToOpenSpool(spool)
  const start = await window.api.station.nfcWrite(station, os, timeoutMs)
  // 409 = es laeuft bereits ein Job (Doppelsenden/StrictMode): nicht als Fehler
  // behandeln, sondern an den laufenden Job anhaengen und dessen Ergebnis zeigen.
  if (!shouldPollAfterStart(start.ok, start.status)) {
    return { ok: false, msg: start.error || i18n.t('lib.writeFailedShort') }
  }

  const deadline = Date.now() + timeoutMs + 8000
  while (Date.now() < deadline) {
    const j = await window.api.station.nfcJob(station)
    if (!j.ok || !j.data) return { ok: false, msg: j.error || i18n.t('lib.jobFetchFailed') }
    const job = j.data
    if (job.state !== 'waiting') {
      if (job.state === 'done' && job.result) {
        const uid = job.result.uid
        const link = await window.api.spoolman.linkCard(spoolmanUrl, spool.id, uid)
        if (!link.ok) {
          return { ok: false, uid, msg: i18n.t('lib.linkFailed', { error: link.error }) }
        }
        return { ok: true, uid, msg: i18n.t('lib.writeLinked', { id: spool.id }) }
      }
      if (job.state === 'timeout') return { ok: false, msg: i18n.t('lib.noTagTimeout') }
      return { ok: false, msg: job.error || i18n.t('lib.writeFailedDot') }
    }
    await sleep(300)
  }
  return { ok: false, msg: i18n.t('lib.writeTimeout') }
}

export interface TagReadResult {
  ok: boolean
  job?: NfcJob
  msg?: string
}

// Startet einen Lesejob und wartet auf das Ergebnis.
export async function readTag(station: StationTarget, timeoutMs = 10000): Promise<TagReadResult> {
  const start = await window.api.station.nfcRead(station, timeoutMs)
  // 409 = es laeuft bereits ein Job: an den laufenden Job anhaengen statt Fehler.
  if (!shouldPollAfterStart(start.ok, start.status)) {
    return { ok: false, msg: start.error || i18n.t('lib.readFailedShort') }
  }
  const deadline = Date.now() + timeoutMs + 8000
  while (Date.now() < deadline) {
    const j = await window.api.station.nfcJob(station)
    if (!j.ok || !j.data) return { ok: false, msg: j.error || i18n.t('lib.jobFetchFailed') }
    if (j.data.state !== 'waiting') return { ok: true, job: j.data }
    await sleep(300)
  }
  return { ok: false, msg: i18n.t('lib.readTimeout') }
}
