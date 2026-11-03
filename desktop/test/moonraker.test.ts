import { describe, it, expect } from 'vitest'
import { parseSlots, parseState } from '../src/main/moonraker'

const AFC_NAMES = ['AFC_lane E0', 'AFC_lane E1', 'AFC_lane E2', 'AFC_lane E3']

// Exakt die reale Antwort des Druckers auf
// GET /printer/objects/query?AFC_lane E0..E3 (result.status)
const realStatus: Record<string, unknown> = {
  'AFC_lane E0': { name: 'E0', unit: 'U1', lane: 0, extruder: 'extruder', map: 'T0', load: true, prep: true, tool_loaded: true, loaded_to_hub: false, material: 'PLA', filament_name: 'Generic PLA', spool_id: 0, color: '#FFFFFF', runout_lane: 'AUTO', filament_status: 'unknown', filament_status_led: 'gray', status: 'empty' },
  'AFC_lane E1': { name: 'E1', unit: 'U1', lane: 1, extruder: 'extruder1', map: 'T1', load: true, prep: true, tool_loaded: true, loaded_to_hub: false, material: 'PETG', filament_name: 'Creality PETG', spool_id: 7, color: '#000000', runout_lane: 'AUTO', filament_status: 'unknown', filament_status_led: 'gray', status: 'empty' },
  'AFC_lane E2': { name: 'E2', unit: 'U1', lane: 2, extruder: 'extruder2', map: 'T2', load: true, prep: true, tool_loaded: true, loaded_to_hub: false, material: 'PLA', filament_name: 'Generic PLA', spool_id: 0, color: '#6F4C2F', runout_lane: 'AUTO', filament_status: 'unknown', filament_status_led: 'gray', status: 'empty' },
  'AFC_lane E3': { name: 'E3', unit: 'U1', lane: 3, extruder: 'extruder3', map: 'T3', load: true, prep: true, tool_loaded: true, loaded_to_hub: false, material: 'PLA', filament_name: 'Generic PLA', spool_id: 0, color: '#000000', runout_lane: 'AUTO', filament_status: 'unknown', filament_status_led: 'gray', status: 'empty' }
}

describe('parseSlots – echte AFC_lane-Antwort', () => {
  const slots = parseSlots(realStatus, AFC_NAMES)

  it('liefert vier Slots (aus den Lanes)', () => {
    expect(slots).toHaveLength(4)
  })

  it('Slot 1 Generic PLA weiss', () => {
    expect(slots[0]).toMatchObject({ name: 'Generic PLA', mainType: 'PLA', colorHex: 'FFFFFF', present: true })
    expect(slots[0].spoolId).toBeUndefined() // spool_id 0 => keine
  })
  it('Slot 2 Creality PETG schwarz mit Spoolman-Spule 7', () => {
    expect(slots[1]).toMatchObject({ name: 'Creality PETG', mainType: 'PETG', colorHex: '000000', spoolId: 7, present: true })
  })
  it('Slot 3 Generic PLA #6F4C2F', () => {
    expect(slots[2]).toMatchObject({ name: 'Generic PLA', mainType: 'PLA', colorHex: '6F4C2F', present: true })
  })
  it('Slot 4 Generic PLA schwarz', () => {
    expect(slots[3]).toMatchObject({ name: 'Generic PLA', mainType: 'PLA', colorHex: '000000', present: true })
  })

  it('zeigt nie "NONE" oder Temperaturen (nur AFC)', () => {
    for (const s of slots) {
      expect(s.mainType).not.toBe('NONE')
      expect(s.name).not.toBe('NONE')
      expect(s.hotendMin).toBeUndefined()
      expect(s.bedTemp).toBeUndefined()
    }
  })
})

describe('parseSlots – filament_detect "NONE" darf AFC-Farbe nicht ueberschreiben', () => {
  const status: Record<string, unknown> = {
    ...realStatus,
    filament_detect: {
      info: [
        undefined,
        undefined,
        // Slot 3: VENDOR NONE + weisses RGB_1 -> kompletter Eintrag ignorieren
        { VENDOR: 'NONE', MAIN_TYPE: 'NONE', RGB_1: 16777215, HOTEND_MIN_TEMP: 200, BED_TEMP: 60 },
        undefined
      ]
    }
  }
  const slots = parseSlots(status, AFC_NAMES)

  it('Slot 3 bleibt braun (#6F4C2F), keine weisse RGB_1, keine Temperaturen', () => {
    expect(slots[2]).toMatchObject({ name: 'Generic PLA', mainType: 'PLA', colorHex: '6F4C2F' })
    expect(slots[2].hotendMin).toBeUndefined()
    expect(slots[2].bedTemp).toBeUndefined()
  })
})

describe('parseSlots – gueltiges filament_detect liefert nur Temps/Subtype/UID', () => {
  const status: Record<string, unknown> = {
    ...realStatus,
    filament_detect: {
      info: [
        undefined,
        // Slot 2 gueltig: liefert Temps + Subtyp, Farbe/Material/Name bleiben aus AFC
        { VENDOR: 'Creality', MAIN_TYPE: 'PETG', SUB_TYPE: 'Matte', RGB_1: 16777215, HOTEND_MIN_TEMP: 230, HOTEND_MAX_TEMP: 250, BED_TEMP: 80, CARD_UID: [4, 161, 178] },
        undefined,
        undefined
      ]
    }
  }
  const slots = parseSlots(status, AFC_NAMES)

  it('Temps/Subtyp/UID kommen aus filament_detect', () => {
    expect(slots[1]).toMatchObject({ subType: 'Matte', hotendMin: 230, hotendMax: 250, bedTemp: 80, cardUid: '04A1B2' })
  })
  it('Farbe/Material/Name bleiben aus AFC (schwarz, PETG, Creality PETG)', () => {
    expect(slots[1]).toMatchObject({ colorHex: '000000', mainType: 'PETG', name: 'Creality PETG' })
  })
})

describe('parseState – Druckerzustand', () => {
  it('druckt: state/filename/Fortschritt aus virtual_sdcard', () => {
    const s = parseState({
      print_stats: { state: 'printing', filename: 'drache_v3.gcode' },
      virtual_sdcard: { progress: 0.423 }
    })
    expect(s).toEqual({ state: 'printing', filename: 'drache_v3.gcode', message: undefined, progress: 42 })
  })

  it('Fortschritt faellt auf display_status zurueck', () => {
    const s = parseState({ print_stats: { state: 'printing', filename: 'x.gcode' }, display_status: { progress: 0.5 } })
    expect(s.progress).toBe(50)
  })

  it('pausiert', () => {
    expect(parseState({ print_stats: { state: 'paused' } }).state).toBe('paused')
  })

  it('Fehler mit Meldung', () => {
    const s = parseState({ print_stats: { state: 'error', message: 'MCU shutdown' } })
    expect(s).toMatchObject({ state: 'error', message: 'MCU shutdown' })
  })

  it('standby', () => {
    expect(parseState({ print_stats: { state: 'standby' } }).state).toBe('standby')
  })

  it('unbekannter/fehlender Zustand -> unknown', () => {
    expect(parseState({}).state).toBe('unknown')
    expect(parseState({ print_stats: { state: 'wat' } }).state).toBe('unknown')
  })
})
