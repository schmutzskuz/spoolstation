import type { IpcResult, OpenSpool, PrinterState, PrinterTarget, SlotInfo } from '../shared/types'

function base(t: PrinterTarget): string {
  return `http://${t.host}:${t.port}`
}

async function http<T>(
  url: string,
  method: string,
  body?: unknown,
  timeoutMs = 4000
): Promise<IpcResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })
    const text = await res.text()
    let data: unknown = text
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      /* Rohtext behalten */
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}`, data: data as T }
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (err) {
    const e = err as Error
    return {
      ok: false,
      error:
        e.name === 'AbortError' ? 'Drucker nicht erreichbar (Zeitüberschreitung)' : e.message || 'Netzwerkfehler'
    }
  } finally {
    clearTimeout(timer)
  }
}

function intToHex(n: unknown): string | undefined {
  if (typeof n !== 'number' || !isFinite(n)) return undefined
  return (n & 0xffffff).toString(16).padStart(6, '0').toUpperCase()
}

function uidArrayToHex(arr: unknown): string | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined
  return arr
    .map((b) => Number(b).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined
  return String(v)
}
function num(v: unknown): number | undefined {
  if (typeof v === 'number') return v
  const n = Number(v)
  return isFinite(n) ? n : undefined
}

// "NONE"/leer gilt als nicht vorhanden
function cleanStr(v: unknown): string | undefined {
  const s = str(v)
  if (!s) return undefined
  return s.trim().toUpperCase() === 'NONE' ? undefined : s
}
// 0 (Temperatur) gilt als nicht vorhanden
function cleanTemp(v: unknown): number | undefined {
  const n = num(v)
  return n && n > 0 ? n : undefined
}
// Farbe als Grossbuchstaben-Hex ohne '#' (akzeptiert "#RRGGBB" und "RRGGBB")
function normHex(v: unknown): string | undefined {
  const s = cleanStr(v)
  if (!s) return undefined
  const h = s.replace('#', '')
  return /^[0-9a-fA-F]{6}$/.test(h) ? h.toUpperCase() : undefined
}

// Reine Auswertung einer Moonraker-Statusantwort -> Slots (so viele wie es
// AFC_lane-Objekte gibt, sonst 4). Regeln:
// - AFC_lane ist Hauptquelle fuer name (filament_name), material, color
//   (#RRGGBB) und spool_id. Zuordnung Lane -> Slot ueber das Feld 'lane' (0..3),
//   NICHT ueber die Reihenfolge. 'name' (=E0) ist der Lane-Name und wird NICHT
//   als Anzeigename verwendet. spool_id 0 = keine Spoolman-Spule.
// - filament_detect liefert nur Temperaturen, SUB_TYPE und CARD_UID – und nur,
//   wenn VENDOR und MAIN_TYPE gueltig sind (nicht "NONE"/leer). Sonst wird der
//   ganze filament_detect-Eintrag dieses Slots ignoriert (auch RGB_1).
export function parseSlots(status: Record<string, unknown>, afcObjects: string[]): SlotInfo[] {
  const fd = status['filament_detect'] as { info?: unknown[] } | undefined
  const info = fd?.info

  interface Afc { material?: string; color?: string; name?: string; weight?: number; spoolId?: number }
  const afc: Record<number, Afc> = {}
  let maxLane = -1
  for (const o of afcObjects) {
    const st = status[o] as Record<string, unknown> | undefined
    if (!st) continue
    const laneIdx = num(st['lane'])
    const ch = laneIdx !== undefined ? laneIdx : parseInt(o.replace(/\D/g, ''), 10)
    if (!(ch >= 0 && ch < 8)) continue
    const sid = num(st['spool_id'])
    const w = num(st['weight'])
    afc[ch] = {
      material: cleanStr(st['material']),
      color: normHex(st['color']),
      name: cleanStr(st['filament_name']),
      weight: w && w > 0 ? w : undefined,
      spoolId: sid && sid > 0 ? sid : undefined
    }
    if (ch > maxLane) maxLane = ch
  }

  const count = maxLane >= 0 ? maxLane + 1 : 4
  const slots: SlotInfo[] = []
  for (let ch = 0; ch < count; ch++) {
    const a = afc[ch] || {}
    const raw = (Array.isArray(info) ? info[ch] : undefined) as Record<string, unknown> | undefined

    // filament_detect nur verwenden, wenn der Eintrag gueltig ist
    const fdValid = !!raw && !!cleanStr(raw['VENDOR']) && !!cleanStr(raw['MAIN_TYPE'])
    const subType = fdValid ? cleanStr(raw!['SUB_TYPE']) : undefined
    const hotendMin = fdValid ? cleanTemp(raw!['HOTEND_MIN_TEMP']) : undefined
    const hotendMax = fdValid ? cleanTemp(raw!['HOTEND_MAX_TEMP']) : undefined
    const bedTemp = fdValid ? cleanTemp(raw!['BED_TEMP']) : undefined
    const cardUid = fdValid ? uidArrayToHex(raw!['CARD_UID']) : undefined

    // AFC primaer, filament_detect nur als Fallback (z. B. ohne AFC-Lite)
    const name = a.name ?? (fdValid ? cleanStr(raw!['VENDOR']) : undefined)
    const material = a.material ?? (fdValid ? cleanStr(raw!['MAIN_TYPE']) : undefined)
    const fdRgb = fdValid ? num(raw!['RGB_1']) : undefined
    const colorHex = a.color ?? (fdRgb && fdRgb > 0 ? intToHex(fdRgb) : undefined)

    const present = Boolean(name || material || colorHex || cardUid || a.spoolId)

    slots.push({
      channel: ch,
      present,
      mainType: material,
      subType,
      colorHex,
      hotendMin,
      hotendMax,
      bedTemp,
      cardUid,
      spoolId: a.spoolId,
      name,
      weight: a.weight
    })
  }
  return slots
}

// Fragt die vier Slots ab. Primaerquelle fuer die Spulen-ID sind die
// AFC_lane-Objekte (get_status().spool_id); existieren sie nicht (AFC-Lite
// nicht aktiv), bleibt spoolId leer und das PC-Programm nutzt seinen Cache.
export async function query(t: PrinterTarget): Promise<IpcResult<SlotInfo[]>> {
  // 1. Welche Objekte gibt es? -> AFC_lane E0..E3 finden
  const listRes = await http<{ result?: { objects?: string[] } }>(
    base(t) + '/printer/objects/list',
    'GET'
  )
  const afcObjects =
    listRes.ok && Array.isArray(listRes.data?.result?.objects)
      ? (listRes.data!.result!.objects as string[]).filter((o) => o.startsWith('AFC_lane '))
      : []

  // 2. filament_detect + vorhandene AFC_lane-Objekte in einer Query holen
  let url = base(t) + '/printer/objects/query?filament_detect'
  for (const o of afcObjects) url += '&' + encodeURIComponent(o)

  const res = await http<{ result?: { status?: Record<string, unknown> } }>(url, 'GET')
  if (!res.ok || !res.data) return { ok: false, error: res.error || 'Keine Daten vom Drucker', status: res.status }

  const status = (res.data.result?.status ?? {}) as Record<string, unknown>
  return { ok: true, data: parseSlots(status, afcObjects) }
}

// Reine Auswertung einer Moonraker-Statusantwort -> Druckerzustand.
// state aus print_stats.state; Fortschritt bevorzugt aus virtual_sdcard.progress
// (0..1), sonst display_status.progress. filename/message aus print_stats.
export function parseState(status: Record<string, unknown>): Omit<PrinterState, 'reachable'> {
  const ps = status['print_stats'] as Record<string, unknown> | undefined
  const vs = status['virtual_sdcard'] as Record<string, unknown> | undefined
  const ds = status['display_status'] as Record<string, unknown> | undefined

  const raw = String(ps?.['state'] ?? '').toLowerCase()
  const allowed = ['standby', 'printing', 'paused', 'complete', 'cancelled', 'error']
  const state = (allowed.includes(raw) ? raw : 'unknown') as PrinterState['state']

  const filename = cleanStr(ps?.['filename'])
  const message = cleanStr(ps?.['message'])
  let prog = num(vs?.['progress'])
  if (prog === undefined) prog = num(ds?.['progress'])
  const progress = prog !== undefined ? Math.round(Math.max(0, Math.min(1, prog)) * 100) : undefined

  return { state, filename, message, progress }
}

// Fragt den Druckerzustand ab (print_stats + Fortschritt). Nicht erreichbar ->
// ok:true mit reachable:false, damit die UI "getrennt" anzeigen kann.
export async function queryState(t: PrinterTarget): Promise<IpcResult<PrinterState>> {
  const url = base(t) + '/printer/objects/query?print_stats&virtual_sdcard&display_status'
  const res = await http<{ result?: { status?: Record<string, unknown> } }>(url, 'GET')
  if (!res.ok || !res.data) return { ok: true, data: { reachable: false, state: 'unknown' } }
  const status = (res.data.result?.status ?? {}) as Record<string, unknown>
  return { ok: true, data: { reachable: true, ...parseState(status) } }
}

function hexToBytes(hex: string): number[] {
  const out: number[] = []
  for (let i = 0; i + 1 < hex.length; i += 2) out.push(parseInt(hex.substr(i, 2), 16))
  return out
}
function toInt(s: string | undefined): number | undefined {
  if (!s) return undefined
  const n = parseInt(s, 10)
  return isNaN(n) ? undefined : n
}

// Weist einem Slot ein Filament zu: filament_detect/set + SET_SPOOL_ID.
// uidHex optional (tag-lose Zuweisung ohne CARD_UID).
export async function assign(
  t: PrinterTarget,
  channel: number,
  os: OpenSpool,
  uidHex?: string
): Promise<IpcResult<{ response: string }>> {
  const info: Record<string, unknown> = {}
  if (os.brand) info['VENDOR'] = os.brand
  if (os.type) info['MAIN_TYPE'] = os.type
  if (os.subtype) info['SUB_TYPE'] = os.subtype
  if (os.color_hex) info['RGB_1'] = parseInt(os.color_hex.replace('#', ''), 16)
  if (os.alpha) info['ALPHA'] = parseInt(os.alpha, 16)
  const hmin = toInt(os.min_temp)
  const hmax = toInt(os.max_temp)
  const bed = toInt(os.bed_min_temp)
  if (hmin !== undefined) info['HOTEND_MIN_TEMP'] = hmin
  if (hmax !== undefined) info['HOTEND_MAX_TEMP'] = hmax
  if (bed !== undefined) info['BED_TEMP'] = bed
  if (uidHex) info['CARD_UID'] = hexToBytes(uidHex)

  const r1 = await http<unknown>(base(t) + '/printer/filament_detect/set', 'POST', { channel, info })
  if (!r1.ok) return { ok: false, error: 'filament_detect fehlgeschlagen: ' + (r1.error || ''), status: r1.status }

  const spoolId = toInt(os.spool_id)
  let resp = 'filament_detect gesetzt'
  if (spoolId && spoolId > 0) {
    const script = `SET_SPOOL_ID CHANNEL=${channel} SPOOL_ID=${spoolId}`
    const r2 = await http<unknown>(base(t) + '/printer/gcode/script', 'POST', { script }, 9000)
    if (!r2.ok) return { ok: false, error: 'SET_SPOOL_ID fehlgeschlagen: ' + (r2.error || ''), status: r2.status }
    resp += ' | SET_SPOOL_ID ok'
  }
  return { ok: true, data: { response: resp } }
}

// Leert einen Slot (SET_SPOOL_ID ... SPOOL_ID=0).
export async function clearSlot(t: PrinterTarget, channel: number): Promise<IpcResult<{ response: string }>> {
  const r = await http<unknown>(
    base(t) + '/printer/gcode/script',
    'POST',
    { script: `SET_SPOOL_ID CHANNEL=${channel} SPOOL_ID=0` },
    9000
  )
  return r.ok ? { ok: true, data: { response: 'Slot geleert' } } : { ok: false, error: r.error, status: r.status }
}
