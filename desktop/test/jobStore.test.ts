import { describe, it, expect, vi } from 'vitest'
import { startJob, getJob, resetJob, subscribeJob } from '../src/renderer/src/lib/jobStore'

describe('jobStore – Starten einmal, Verfolgen bei jedem Mount', () => {
  it('startet fn genau einmal, auch bei Doppel-Mount (StrictMode)', async () => {
    resetJob('k1')
    const fn = vi.fn(async () => { await Promise.resolve(); return { ok: true, msg: 'ok', uid: 'AABB' } })
    startJob('k1', fn) // Mount 1
    startJob('k1', fn) // Mount 2 (StrictMode) -> kein zweiter Start
    expect(fn).toHaveBeenCalledTimes(1)
    await new Promise((r) => setTimeout(r, 0))
    expect(getJob('k1')).toEqual({ running: false, result: { ok: true, msg: 'ok', uid: 'AABB' } })
  })

  it('ohne Doppel-Mount: Erfolg kommt ebenso an', async () => {
    resetJob('k1b')
    startJob('k1b', async () => ({ ok: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(getJob('k1b').result).toEqual({ ok: true })
  })

  it('spaet hinzukommender Abonnent (Remount) sieht das Ergebnis', async () => {
    resetJob('k2')
    let resolve!: (v: unknown) => void
    startJob('k2', () => new Promise((r) => { resolve = r }))
    expect(getJob('k2').running).toBe(true)
    resolve({ ok: true })
    await new Promise((r) => setTimeout(r, 0))
    // Erst nach dem Abschluss abonnieren (wie nach einem Remount):
    const unsub = subscribeJob('k2', () => {})
    expect(getJob('k2')).toEqual({ running: false, result: { ok: true } })
    unsub()
  })

  it('resetJob loescht den Zustand (Erneut versuchen)', () => {
    resetJob('k3')
    startJob('k3', async () => ({ ok: false }))
    resetJob('k3')
    expect(getJob('k3')).toEqual({ running: false })
  })

  it('getJob liefert bei gleichem Zustand dieselbe Referenz (useSyncExternalStore)', async () => {
    resetJob('k4')
    startJob('k4', async () => ({ ok: true }))
    await new Promise((r) => setTimeout(r, 0))
    expect(getJob('k4')).toBe(getJob('k4'))
  })
})
