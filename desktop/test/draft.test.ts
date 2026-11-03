import { describe, it, expect } from 'vitest'
import { isDraftDirty, needsEmptyListConfirm } from '../src/renderer/src/lib/draft'

// Simuliert die Druckerliste als JSON (so wie die Karte vergleicht).
const base = JSON.stringify([{ name: 'Snapmaker U1', host: '192.168.1.42', port: 7125 }])

describe('isDraftDirty – Entwurf vs. zuletzt geladener Stand', () => {
  it('ist NICHT dirty, solange der Nutzer nichts editiert hat (auch wenn Entwurf noch leer ist)', () => {
    // Genau der gemeldete Fehlerfall: Liste noch leer, Basis schon vom Server geladen.
    expect(isDraftDirty(false, '[]', base)).toBe(false)
  })

  it('ist NICHT dirty, wenn Entwurf == Basis', () => {
    expect(isDraftDirty(true, base, base)).toBe(false)
  })

  it('ist dirty nur nach echter Aenderung', () => {
    const changed = JSON.stringify([{ name: 'Snapmaker U1', host: '192.168.1.42', port: 7126 }])
    expect(isDraftDirty(true, changed, base)).toBe(true)
    expect(isDraftDirty(false, changed, base)).toBe(false)
  })
})

describe('needsEmptyListConfirm – Leer-Schutz', () => {
  it('verlangt Bestaetigung, wenn eine leere Liste gespeichert wird und vorher Drucker da waren', () => {
    expect(needsEmptyListConfirm(0, base)).toBe(true)
  })
  it('verlangt KEINE Bestaetigung, wenn vorher schon leer', () => {
    expect(needsEmptyListConfirm(0, '[]')).toBe(false)
  })
  it('verlangt KEINE Bestaetigung, wenn die Basis noch gar nicht geladen wurde', () => {
    expect(needsEmptyListConfirm(0, '')).toBe(false)
  })
  it('verlangt KEINE Bestaetigung, wenn weiterhin Drucker vorhanden sind', () => {
    expect(needsEmptyListConfirm(2, base)).toBe(false)
  })
})
