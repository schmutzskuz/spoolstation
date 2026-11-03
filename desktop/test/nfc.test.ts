import { describe, it, expect } from 'vitest'
import { shouldPollAfterStart } from '../src/renderer/src/lib/nfc'

describe('shouldPollAfterStart – 409 anhaengen statt Fehler', () => {
  it('pollt weiter, wenn der Start ok war', () => {
    expect(shouldPollAfterStart(true, 202)).toBe(true)
  })
  it('pollt weiter bei 409 (laeuft bereits / Doppelsenden)', () => {
    expect(shouldPollAfterStart(false, 409)).toBe(true)
  })
  it('bricht bei echten Fehlern ab', () => {
    expect(shouldPollAfterStart(false, 500)).toBe(false)
    expect(shouldPollAfterStart(false, undefined)).toBe(false)
  })
})
