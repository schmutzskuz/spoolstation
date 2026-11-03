import type React from 'react'
import i18n from '@/i18n'
import type { ExternalFilament, OpenSpool, SpoolmanSpool } from '../../../shared/types'

// extra-Werte sind in Spoolman doppelt JSON-kodiert.
export function decodeExtra(raw?: string): string {
  if (raw === undefined || raw === null) return ''
  try {
    const v = JSON.parse(raw)
    return typeof v === 'string' ? v : String(v)
  } catch {
    return raw
  }
}

export function cardUidsOf(spool: SpoolmanSpool): string[] {
  return decodeExtra(spool.extra?.card_uids)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0)
}

export function colorStyle(hex?: string): React.CSSProperties {
  const h = (hex || '').replace('#', '')
  return /^[0-9a-fA-F]{6}$/.test(h)
    ? { backgroundColor: `#${h}` }
    : { backgroundColor: 'transparent', border: '1px dashed hsl(var(--border))' }
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(i18n.language).format(n)
}

export function formatWeight(g?: number): string {
  if (g === undefined || g === null || isNaN(g)) return '–'
  return `${formatNumber(Math.round(g))} g`
}

export function formatDate(iso?: string): string {
  if (!iso) return '–'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '–'
  return new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

// Lokalisierte Relativzeit ("zuletzt benutzt vor ...").
export function relativeTime(iso?: string): string {
  const t = i18n.t.bind(i18n)
  if (!iso) return t('spool.neverUsed')
  const d = new Date(iso)
  if (isNaN(d.getTime())) return t('spool.neverUsed')
  const sec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (sec < 60) return t('spool.justNow')
  const min = Math.floor(sec / 60)
  if (min < 60) return t('spool.agoMin', { n: min })
  const h = Math.floor(min / 60)
  if (h < 24) return t('spool.agoHours', { n: h })
  const days = Math.floor(h / 24)
  if (days < 30) return t('spool.agoDays', { count: days })
  const months = Math.floor(days / 30)
  if (months < 12) return t('spool.agoMonths', { count: months })
  const years = Math.floor(days / 365)
  return t('spool.agoYears', { count: years })
}

// Füllstand in Prozent (0..100), falls berechenbar.
export function fillPercent(spool: SpoolmanSpool): number | undefined {
  const init = spool.initial_weight ?? spool.filament?.weight
  const rem = spool.remaining_weight
  if (!init || rem === undefined || rem === null || init <= 0) return undefined
  return Math.max(0, Math.min(100, (rem / init) * 100))
}

// extra-Werte sind JSON-kodiert. Typisiert dekodieren/kodieren.
export function decodeExtraValue(raw?: string): unknown {
  if (raw === undefined || raw === null || raw === '') return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}
export function encodeExtraValue(value: unknown): string {
  return JSON.stringify(value)
}

export function spoolLabel(spool: SpoolmanSpool): string {
  const f = spool.filament
  const parts = [f?.vendor?.name, f?.material, f?.name].filter(Boolean)
  return parts.join(' ') || `Spule #${spool.id}`
}

// Spoolman-Spule -> OpenSpool (fuer Tag schreiben und Drucker-Zuweisung).
export function spoolToOpenSpool(spool: SpoolmanSpool): OpenSpool {
  const f = spool.filament
  const extruder = f?.settings_extruder_temp
  const bed = f?.settings_bed_temp
  return {
    protocol: 'openspool',
    version: '1.0',
    brand: f?.vendor?.name || '',
    type: f?.material || '',
    subtype: decodeExtra(f?.extra?.variant),
    color_hex: (f?.color_hex || '').replace('#', ''),
    alpha: 'FF',
    min_temp: extruder ? String(extruder) : '',
    max_temp: extruder ? String(extruder) : '',
    bed_min_temp: bed ? String(bed) : '',
    bed_max_temp: bed ? String(bed) : '',
    spool_id: String(spool.id)
  }
}

// Gaengige Materialien fuer die Auswahl.
export const COMMON_MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'PC', 'PVA', 'HIPS', 'PP']

// Vorschlagsdichte (g/cm3) je Material.
const DENSITY: Record<string, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  ASA: 1.07,
  TPU: 1.21,
  NYLON: 1.14,
  PA: 1.14,
  PC: 1.2,
  PVA: 1.23,
  HIPS: 1.04,
  PP: 0.9
}
export function materialDensity(material: string): number {
  const key = material.trim().toUpperCase().split(/[\s+]/)[0]
  return DENSITY[key] ?? 1.24
}

// Externes Filament -> Body fuer POST /filament (ohne vendor_id, wird separat gesetzt).
export function externalToFilamentBody(ext: ExternalFilament): Record<string, unknown> {
  return {
    name: ext.name,
    material: ext.material || 'PLA',
    density: ext.density ?? 1.24,
    diameter: ext.diameter ?? 1.75,
    color_hex: (ext.color_hex || '').replace('#', '') || undefined,
    spool_weight: ext.spool_weight,
    weight: ext.weight,
    settings_extruder_temp: ext.extruder_temp,
    settings_bed_temp: ext.bed_temp
  }
}
