// Reine Hilfsfunktionen fuer den Firmware-Update-Vergleich (ohne Electron,
// damit sie in Tests laufen). Von main/firmwareUpdate.ts benutzt.

export interface FwOtaFile {
  size: number
  sha256: string
}

export interface FwManifest {
  version: string
  api_version: number
  ota: FwOtaFile
}

// Semver-Vergleich (nur x.y.z, Vorab-/Build-Teile werden ignoriert).
// -1 = a < b, 0 = gleich, 1 = a > b.
export function compareVersions(a: string, b: string): number {
  const parse = (v: string): number[] => {
    const m = /^\s*v?(\d+)\.(\d+)\.(\d+)/.exec(v || '')
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
  }
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1
    if (pa[i] < pb[i]) return -1
  }
  return 0
}

// firmware-manifest.json validieren und auf das Noetige reduzieren.
// Gibt null zurueck, wenn Pflichtfelder fehlen oder kein ota-Eintrag da ist.
export function parseManifest(obj: unknown): FwManifest | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const version = typeof o.version === 'string' ? o.version : ''
  if (!/^\d+\.\d+\.\d+/.test(version)) return null
  const api = typeof o.api_version === 'number' ? o.api_version : Number(o.api_version)
  if (!Number.isFinite(api)) return null
  if (!Array.isArray(o.files)) return null
  const ota = (o.files as Record<string, unknown>[]).find((f) => f && f.role === 'ota')
  if (!ota) return null
  const sha = typeof ota.sha256 === 'string' ? ota.sha256.toLowerCase() : ''
  const size = typeof ota.size === 'number' ? ota.size : Number(ota.size)
  if (!/^[0-9a-f]{64}$/.test(sha) || !Number.isFinite(size) || size <= 0) return null
  return { version, api_version: api, ota: { size, sha256: sha } }
}

export interface UpdateDecision {
  available: boolean
  from: string
  to?: string
  source?: 'latest' | 'bundled'
  // Ziel-api_version weicht von der ab, die die App erwartet -> Hinweis noetig.
  apiMismatch?: boolean
}

// Entscheidet, ob ein Firmware-Update ansteht und aus welcher Quelle.
// Bevorzugt das Release (latest); wenn offline, dient die mitgelieferte
// Firmware (bundled) als Fallback. Angeboten wird nur, was neuer als die
// aktuell laufende Station-Version ist.
export function decideStationUpdate(args: {
  stationVersion: string
  expectedApi: number
  latest?: FwManifest | null
  bundled?: FwManifest | null
}): UpdateDecision {
  const { stationVersion, expectedApi, latest, bundled } = args
  const from = stationVersion || '0.0.0'

  // Kandidaten, die neuer als die Station sind.
  const cand: { m: FwManifest; source: 'latest' | 'bundled' }[] = []
  if (latest && compareVersions(latest.version, from) > 0) cand.push({ m: latest, source: 'latest' })
  if (bundled && compareVersions(bundled.version, from) > 0) cand.push({ m: bundled, source: 'bundled' })

  if (cand.length === 0) return { available: false, from }

  // Neueste Version waehlen; bei Gleichstand das Release bevorzugen.
  cand.sort((a, b) => {
    const c = compareVersions(b.m.version, a.m.version)
    if (c !== 0) return c
    return a.source === 'latest' ? -1 : 1
  })
  const best = cand[0]
  return {
    available: true,
    from,
    to: best.m.version,
    source: best.source,
    apiMismatch: best.m.api_version !== expectedApi
  }
}
