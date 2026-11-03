// Single-Flight-Store fuer Station-Jobs (Tag schreiben/lesen).
//
// Trennt "Starten" (genau einmal pro Schluessel) von "Verfolgen" (bei jedem
// Mount neu abonnierbar). Dadurch sind React-StrictMode-Remounts egal: der
// laufende Job lebt im Store weiter, und ein spaet hinzukommender Abonnent
// bekommt das Ergebnis trotzdem. Der eigentliche Poll-Loop steckt in `fn`
// (writeTagForSpool/readTag), dessen Promise hier gehalten wird.

export interface JobEntry<T> {
  running: boolean
  result?: T
}

const inflight = new Map<string, Promise<unknown>>()
const results = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()
// Stabile Snapshots fuer useSyncExternalStore (nur bei echter Aenderung neu).
const snapshots = new Map<string, JobEntry<unknown>>()
const EMPTY: JobEntry<unknown> = Object.freeze({ running: false })

function refresh(key: string): void {
  snapshots.set(key, { running: inflight.has(key), result: results.get(key) })
  const set = listeners.get(key)
  if (set) for (const cb of set) cb()
}

// Startet `fn` genau einmal pro Schluessel. Weitere Aufrufe (z. B. zweiter
// StrictMode-Mount) haengen sich an den laufenden Job an, statt neu zu starten.
export function startJob<T>(key: string, fn: () => Promise<T>): void {
  if (inflight.has(key) || results.has(key)) return
  const p = fn().then(
    (r) => { results.set(key, r); inflight.delete(key); refresh(key); return r },
    (err) => { inflight.delete(key); refresh(key); throw err }
  )
  inflight.set(key, p)
  refresh(key)
}

export function getJob<T>(key: string): JobEntry<T> {
  return (snapshots.get(key) as JobEntry<T>) ?? (EMPTY as JobEntry<T>)
}

// Setzt einen Schluessel zurueck (Dialog geschlossen oder "Erneut versuchen").
export function resetJob(key: string): void {
  inflight.delete(key)
  results.delete(key)
  snapshots.delete(key)
  const set = listeners.get(key)
  if (set) for (const cb of set) cb()
}

export function subscribeJob(key: string, cb: () => void): () => void {
  let set = listeners.get(key)
  if (!set) { set = new Set(); listeners.set(key, set) }
  set.add(cb)
  return () => { set!.delete(cb) }
}
