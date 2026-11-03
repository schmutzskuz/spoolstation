import type {
  EntityType,
  ExternalFilament,
  IpcResult,
  SpoolmanField,
  SpoolmanFilament,
  SpoolmanInfo,
  SpoolmanSpool,
  SpoolmanVendor
} from '../shared/types'

function apiBase(url: string): string {
  return url.trim().replace(/\/+$/, '') + '/api/v1'
}

async function call<T>(
  url: string,
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 6000
): Promise<IpcResult<T>> {
  if (!url.trim()) return { ok: false, error: 'Keine Spoolman-URL gesetzt' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(apiBase(url) + path, {
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
      const msg =
        (data && typeof data === 'object' && 'message' in data
          ? String((data as Record<string, unknown>).message)
          : '') || `HTTP ${res.status}`
      return { ok: false, status: res.status, error: msg, data: data as T }
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (err) {
    const e = err as Error
    return {
      ok: false,
      error:
        e.name === 'AbortError'
          ? 'Spoolman nicht erreichbar (Zeitüberschreitung)'
          : e.message || 'Netzwerkfehler'
    }
  } finally {
    clearTimeout(timer)
  }
}

/* ---------------- extra-Felder (doppelt JSON-kodiert) ---------------- */
export function decodeExtra(raw?: string): string {
  if (raw === undefined || raw === null) return ''
  try {
    const v = JSON.parse(raw)
    return typeof v === 'string' ? v : String(v)
  } catch {
    return raw
  }
}
function encodeExtra(value: string): string {
  return JSON.stringify(value)
}
export function cardUidsOf(spool: SpoolmanSpool): string[] {
  const raw = spool.extra?.card_uids
  return decodeExtra(raw)
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0)
}

/* ---------------- Info / Ping ---------------- */
export function info(url: string): Promise<IpcResult<SpoolmanInfo>> {
  return call<SpoolmanInfo>(url, 'GET', '/info', undefined, 3500)
}

/* ---------------- Spulen ---------------- */
export function listSpools(url: string): Promise<IpcResult<SpoolmanSpool[]>> {
  return call<SpoolmanSpool[]>(url, 'GET', '/spool?allow_archived=true', undefined, 8000)
}
export function getSpool(url: string, id: number): Promise<IpcResult<SpoolmanSpool>> {
  return call<SpoolmanSpool>(url, 'GET', `/spool/${id}`)
}
export function patchSpool(
  url: string,
  id: number,
  body: Record<string, unknown>
): Promise<IpcResult<SpoolmanSpool>> {
  return call<SpoolmanSpool>(url, 'PATCH', `/spool/${id}`, body)
}
export function createSpool(
  url: string,
  body: Record<string, unknown>
): Promise<IpcResult<SpoolmanSpool>> {
  return call<SpoolmanSpool>(url, 'POST', '/spool', body)
}
export function deleteSpool(url: string, id: number): Promise<IpcResult<unknown>> {
  return call<unknown>(url, 'DELETE', `/spool/${id}`)
}
export function useSpool(url: string, id: number, useWeight: number): Promise<IpcResult<SpoolmanSpool>> {
  return call<SpoolmanSpool>(url, 'PUT', `/spool/${id}/use`, { use_weight: useWeight })
}
export function measureSpool(url: string, id: number, grossWeight: number): Promise<IpcResult<SpoolmanSpool>> {
  return call<SpoolmanSpool>(url, 'PUT', `/spool/${id}/measure`, { weight: grossWeight })
}

/* ---------------- Filamente ---------------- */
export function listFilaments(url: string): Promise<IpcResult<SpoolmanFilament[]>> {
  return call<SpoolmanFilament[]>(url, 'GET', '/filament', undefined, 8000)
}
export function getFilament(url: string, id: number): Promise<IpcResult<SpoolmanFilament>> {
  return call<SpoolmanFilament>(url, 'GET', `/filament/${id}`)
}
export function createFilament(
  url: string,
  body: Record<string, unknown>
): Promise<IpcResult<SpoolmanFilament>> {
  return call<SpoolmanFilament>(url, 'POST', '/filament', body)
}
export function patchFilament(
  url: string,
  id: number,
  body: Record<string, unknown>
): Promise<IpcResult<SpoolmanFilament>> {
  return call<SpoolmanFilament>(url, 'PATCH', `/filament/${id}`, body)
}
export function deleteFilament(url: string, id: number): Promise<IpcResult<unknown>> {
  return call<unknown>(url, 'DELETE', `/filament/${id}`)
}

/* ---------------- Hersteller ---------------- */
export function listVendors(url: string): Promise<IpcResult<SpoolmanVendor[]>> {
  return call<SpoolmanVendor[]>(url, 'GET', '/vendor', undefined, 8000)
}
export function createVendor(url: string, name: string): Promise<IpcResult<SpoolmanVendor>> {
  return call<SpoolmanVendor>(url, 'POST', '/vendor', { name })
}
export function getVendor(url: string, id: number): Promise<IpcResult<SpoolmanVendor>> {
  return call<SpoolmanVendor>(url, 'GET', `/vendor/${id}`)
}
export function patchVendor(
  url: string,
  id: number,
  body: Record<string, unknown>
): Promise<IpcResult<SpoolmanVendor>> {
  return call<SpoolmanVendor>(url, 'PATCH', `/vendor/${id}`, body)
}
export function deleteVendor(url: string, id: number): Promise<IpcResult<unknown>> {
  return call<unknown>(url, 'DELETE', `/vendor/${id}`)
}

/* ---------------- Benutzerdefinierte Felder ---------------- */
export function listFields(url: string, entity: EntityType): Promise<IpcResult<SpoolmanField[]>> {
  return call<SpoolmanField[]>(url, 'GET', `/field/${entity}`)
}

/* ---------------- Externe Filamentdatenbank ---------------- */
export async function externalFilaments(url: string): Promise<IpcResult<ExternalFilament[]>> {
  const res = await call<unknown>(url, 'GET', '/external/filament', undefined, 12000)
  if (!res.ok) return { ok: false, error: res.error, status: res.status }
  // Spoolman liefert ein Array; aeltere Versionen evtl. ein Objekt -> normalisieren
  const raw = res.data
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : []
  const list = (arr as Record<string, unknown>[]).map((e) => ({
    id: String(e.id ?? ''),
    manufacturer: String(e.manufacturer ?? ''),
    name: String(e.name ?? ''),
    material: String(e.material ?? ''),
    density: typeof e.density === 'number' ? e.density : undefined,
    diameter: typeof e.diameter === 'number' ? e.diameter : undefined,
    weight: typeof e.weight === 'number' ? e.weight : undefined,
    spool_weight: typeof e.spool_weight === 'number' ? e.spool_weight : undefined,
    color_hex: e.color_hex ? String(e.color_hex) : undefined,
    extruder_temp: typeof e.extruder_temp === 'number' ? e.extruder_temp : undefined,
    bed_temp: typeof e.bed_temp === 'number' ? e.bed_temp : undefined,
    finish: e.finish ? String(e.finish) : undefined
  })) as ExternalFilament[]
  return { ok: true, data: list }
}

/* ---------------- Zusatzfelder sicherstellen ---------------- */
export async function ensureFields(url: string): Promise<IpcResult<{ ok: true }>> {
  const spoolFields = await call<{ key: string }[]>(url, 'GET', '/field/spool')
  if (spoolFields.ok && Array.isArray(spoolFields.data)) {
    if (!spoolFields.data.some((f) => f.key === 'card_uids')) {
      const r = await call(url, 'POST', '/field/spool/card_uids', {
        name: 'card_uids',
        field_type: 'text',
        default_value: '""'
      })
      if (!r.ok) return { ok: false, error: 'Feld card_uids konnte nicht angelegt werden: ' + r.error }
    }
    if (!spoolFields.data.some((f) => f.key === 'spool_type')) {
      await call(url, 'POST', '/field/spool/spool_type', {
        name: 'Spulen-Typ',
        field_type: 'choice',
        choices: ['Pappe', 'Schwarz', 'Transparent'],
        default_value: '"Pappe"'
      })
    }
  }
  const filFields = await call<{ key: string }[]>(url, 'GET', '/field/filament')
  if (filFields.ok && Array.isArray(filFields.data)) {
    if (!filFields.data.some((f) => f.key === 'variant')) {
      await call(url, 'POST', '/field/filament/variant', {
        name: 'variant',
        field_type: 'text',
        default_value: '""'
      })
    }
  }
  return { ok: true, data: { ok: true } }
}

/* ---------------- Hersteller sicherstellen ---------------- */
export async function ensureVendor(url: string, name: string): Promise<IpcResult<number>> {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Kein Herstellername' }
  const vendors = await listVendors(url)
  if (vendors.ok && vendors.data) {
    const found = vendors.data.find((v) => v.name.toLowerCase() === trimmed.toLowerCase())
    if (found) return { ok: true, data: found.id }
  }
  const created = await createVendor(url, trimmed)
  if (created.ok && created.data) return { ok: true, data: created.data.id }
  return { ok: false, error: created.error || 'Hersteller konnte nicht angelegt werden' }
}

/* ---------------- Tag <-> Spule verknuepfen ---------------- */
// UID bei der Zielspule eintragen und bei allen anderen Spulen entfernen.
export async function linkCard(
  url: string,
  spoolId: number,
  uidHex: string
): Promise<IpcResult<{ changed: number }>> {
  const uid = uidHex.trim().toUpperCase()
  if (!uid) return { ok: false, error: 'Keine UID' }

  await ensureFields(url)

  const all = await listSpools(url)
  if (!all.ok || !all.data) return { ok: false, error: all.error || 'Spulen konnten nicht geladen werden' }

  let changed = 0

  for (const spool of all.data) {
    const uids = cardUidsOf(spool)
    const has = uids.includes(uid)

    if (spool.id === spoolId) {
      if (!has) {
        const next = [...uids, uid]
        const r = await patchSpool(url, spool.id, {
          extra: { ...(spool.extra || {}), card_uids: encodeExtra(next.join(',')) }
        })
        if (!r.ok) return { ok: false, error: 'UID konnte nicht gespeichert werden: ' + r.error }
        changed++
      }
    } else if (has) {
      const next = uids.filter((u) => u !== uid)
      const r = await patchSpool(url, spool.id, {
        extra: { ...(spool.extra || {}), card_uids: encodeExtra(next.join(',')) }
      })
      if (!r.ok) return { ok: false, error: 'UID bei anderer Spule entfernen fehlgeschlagen: ' + r.error }
      changed++
    }
  }

  return { ok: true, data: { changed } }
}

// Spule zu einer UID finden (ueber card_uids).
export async function findSpoolByUid(
  url: string,
  uidHex: string
): Promise<IpcResult<SpoolmanSpool | null>> {
  const uid = uidHex.trim().toUpperCase()
  const all = await listSpools(url)
  if (!all.ok || !all.data) return { ok: false, error: all.error }
  const found = all.data.find((s) => cardUidsOf(s).includes(uid)) || null
  return { ok: true, data: found }
}
