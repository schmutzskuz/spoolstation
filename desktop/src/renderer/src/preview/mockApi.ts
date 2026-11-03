// Mock der Preload-Bridge (window.api) NUR fuer die Entwickler-Vorschau (#/preview).
// Liefert realistische Beispieldaten, damit die echten Seiten-Komponenten ohne Electron/IPC
// gerendert werden koennen. Vorlage: Spoolman-Spulen + die reale AFC_lane-Druckerantwort
// (siehe test/moonraker.test.ts). Wird in main.tsx vor dem Rendern installiert.
import type {
  AppSettings,
  AppUpdateState,
  ExternalFilament,
  FwInfo,
  FwProgress,
  IpcResult,
  NfcJob,
  SlotInfo,
  SpoolmanField,
  SpoolmanFilament,
  SpoolmanSpool,
  SpoolmanVendor,
  StationConfig,
  StationStatus
} from '../../../shared/types'
import { APP_VERSION, STATION_API_VERSION } from '../../../shared/version'

const ok = <T>(data: T): IpcResult<T> => ({ ok: true, data })
// extra-Werte sind in Spoolman doppelt JSON-kodiert.
const enc = (v: string): string => JSON.stringify(v)

/* ---------------- Hersteller ---------------- */
const vendors: SpoolmanVendor[] = [
  { id: 1, name: 'Polymaker', empty_spool_weight: 140, registered: '2025-06-01T10:00:00Z', comment: 'Stammlieferant', extra: {} },
  { id: 2, name: 'Creality', empty_spool_weight: 180, registered: '2025-06-03T10:00:00Z', extra: {} },
  { id: 3, name: 'JAYO', empty_spool_weight: 200, external_id: 'jayo', registered: '2025-07-12T10:00:00Z', extra: {} },
  { id: 4, name: 'Generic', empty_spool_weight: 200, registered: '2025-05-20T10:00:00Z', extra: {} }
]
const vendor = (id: number): SpoolmanVendor => vendors.find((v) => v.id === id) as SpoolmanVendor

/* ---------------- Filamente ---------------- */
const filaments: SpoolmanFilament[] = [
  {
    id: 1, name: 'PolyTerra PLA Army Brown', vendor: vendor(1), material: 'PLA', color_hex: '6F4C2F',
    diameter: 1.75, density: 1.24, weight: 1000, spool_weight: 140, price: 19.99, article_number: 'PA02-0012',
    settings_extruder_temp: 210, settings_bed_temp: 60, registered: '2025-08-01T09:00:00Z',
    comment: 'Matte Oberflaeche, gut fuer Terrain.', extra: { variant: enc('Matte'), max_volumetric_speed: enc('12') }
  },
  {
    id: 2, name: 'CR-PETG Schwarz', vendor: vendor(2), material: 'PETG', color_hex: '111111',
    diameter: 1.75, density: 1.27, weight: 1000, spool_weight: 180, price: 22.5,
    settings_extruder_temp: 240, settings_bed_temp: 70, registered: '2025-08-10T09:00:00Z', extra: { variant: enc('') }
  },
  {
    id: 3, name: 'PolyLite PLA Weiss', vendor: vendor(1), material: 'PLA', color_hex: 'FFFFFF',
    diameter: 1.75, density: 1.24, weight: 1000, spool_weight: 140, price: 17.99,
    settings_extruder_temp: 205, settings_bed_temp: 55, registered: '2025-09-02T09:00:00Z', extra: { variant: enc('') }
  },
  {
    id: 4, name: 'PLA Silk Tri-Color', vendor: vendor(3), material: 'PLA',
    color_hex: 'E53935', multi_color_hexes: 'E53935,FDD835,43A047', multi_color_direction: 'coaxial',
    diameter: 1.75, density: 1.24, weight: 1000, spool_weight: 200, price: 24.9,
    settings_extruder_temp: 215, settings_bed_temp: 60, registered: '2025-10-05T09:00:00Z', extra: { variant: enc('Silk') }
  },
  {
    id: 5, name: 'Generic PLA Blau', vendor: vendor(4), material: 'PLA', color_hex: '1E90FF',
    diameter: 1.75, density: 1.24, weight: 1000, spool_weight: 200,
    settings_extruder_temp: 200, settings_bed_temp: 60, registered: '2025-07-20T09:00:00Z', extra: { variant: enc('') }
  }
]
const fil = (id: number): SpoolmanFilament => filaments.find((f) => f.id === id) as SpoolmanFilament

/* ---------------- Spulen ---------------- */
const spools: SpoolmanSpool[] = [
  {
    id: 42, filament: fil(3), remaining_weight: 820, used_weight: 180, initial_weight: 1000, spool_weight: 140,
    location: 'Regal A', lot_nr: 'L-2026-07', price: 17.99, registered: '2026-07-15T08:00:00Z',
    first_used: '2026-07-20T08:00:00Z', last_used: '2026-11-02T06:00:00Z', comment: 'Angebrochen.',
    extra: { card_uids: enc('04A1B2C3D4E5F6') }
  },
  {
    id: 7, filament: fil(2), remaining_weight: 500, used_weight: 500, initial_weight: 1000, spool_weight: 180,
    location: 'Regal B', registered: '2026-08-11T08:00:00Z', first_used: '2026-08-12T08:00:00Z',
    last_used: '2026-10-20T08:00:00Z', extra: { card_uids: enc('04FA22B19C8080') }
  },
  {
    id: 12, filament: fil(1), remaining_weight: 120, used_weight: 880, initial_weight: 1000, spool_weight: 140,
    location: 'Regal A', registered: '2026-06-01T08:00:00Z', first_used: '2026-06-02T08:00:00Z',
    last_used: '2026-08-15T08:00:00Z', extra: {}
  },
  {
    id: 3, filament: fil(4), remaining_weight: 700, used_weight: 300, initial_weight: 1000, spool_weight: 200,
    location: 'Box 3', registered: '2026-10-06T08:00:00Z', last_used: '2026-09-10T08:00:00Z', extra: {}
  },
  {
    id: 5, filament: fil(5), remaining_weight: 950, used_weight: 50, initial_weight: 1000, spool_weight: 200,
    location: 'Regal C', registered: '2026-07-21T08:00:00Z', last_used: '2026-11-01T08:00:00Z', extra: {}
  },
  {
    id: 9, filament: fil(1), remaining_weight: 1000, used_weight: 0, initial_weight: 1000, spool_weight: 140,
    archived: true, location: 'Lager', registered: '2026-05-10T08:00:00Z', extra: {}
  }
]

/* ---------------- Zusatzfelder ---------------- */
const spoolFields: SpoolmanField[] = [
  { key: 'card_uids', name: 'Tag-UIDs', field_type: 'text', order: 0 }
]
const filamentFields: SpoolmanField[] = [
  { key: 'variant', name: 'Variante', field_type: 'text', order: 0 },
  { key: 'max_volumetric_speed', name: 'Max. Volumenstrom', field_type: 'float', unit: 'mm³/s', order: 1 },
  { key: 'orca_preset', name: 'OrcaSlicer-Preset', field_type: 'text', order: 2 }
]
const vendorFields: SpoolmanField[] = []

/* ---------------- Drucker-Slots (wie parseSlots liefern wuerde) ---------------- */
const U1_SLOTS: SlotInfo[] = [
  { channel: 0, present: true, spoolId: 42, mainType: 'PLA', colorHex: '#FFFFFF', hotendMin: 190, hotendMax: 220, bedTemp: 60, cardUid: '04A1B2C3D4E5F6', name: 'PolyLite PLA Weiss' },
  { channel: 1, present: true, spoolId: 7, mainType: 'PETG', colorHex: '#111111', hotendMin: 240, hotendMax: 250, bedTemp: 70, cardUid: '04FA22B19C8080', name: 'CR-PETG Schwarz' },
  { channel: 2, present: true, spoolId: 12, mainType: 'PLA', colorHex: '#6F4C2F', hotendMin: 190, hotendMax: 220, bedTemp: 60, name: 'PolyTerra PLA Army Brown' },
  { channel: 3, present: false }
]
const MINI_SLOTS: SlotInfo[] = [
  { channel: 0, present: true, spoolId: 5, mainType: 'PLA', colorHex: '#1E90FF', hotendMin: 200, hotendMax: 220, bedTemp: 60, name: 'Generic PLA Blau' },
  { channel: 1, present: false }
]

/* ---------------- Station ---------------- */
const stationStatus: StationStatus = {
  name: 'spoolstation', version: APP_VERSION, api_version: STATION_API_VERSION, ip: '192.168.1.60', rssi: -54, uptime_s: 4215, nfc_ok: true, busy: false, slot: 0
}

export interface MockOpts {
  theme: 'dark' | 'light'
  lang: 'de' | 'en' | 'es'
  printerCount?: number // nur Vorschau: Anzahl der Drucker (0/1/2) zum Testen der Zustaende
}

const externalFilaments: ExternalFilament[] = [
  { id: 'polymaker_pla_white', manufacturer: 'Polymaker', name: 'PolyLite PLA White', material: 'PLA', density: 1.24, diameter: 1.75, weight: 1000, spool_weight: 140, color_hex: 'FFFFFF', extruder_temp: 205, bed_temp: 55 },
  { id: 'prusament_pla_galaxy_black', manufacturer: 'Prusa', name: 'Prusament PLA Galaxy Black', material: 'PLA', density: 1.24, diameter: 1.75, weight: 1000, spool_weight: 200, color_hex: '1A1A1A', extruder_temp: 215, bed_temp: 60 },
  { id: 'bambu_petg_hf_green', manufacturer: 'Bambu Lab', name: 'PETG HF Green', material: 'PETG', density: 1.27, diameter: 1.75, weight: 1000, spool_weight: 190, color_hex: '2E7D32', extruder_temp: 250, bed_temp: 70 }
]

export function createMockApi(opts: MockOpts) {
  let settings: AppSettings = {
    stationHost: '192.168.1.60',
    apiKey: 'demo-key',
    spoolmanUrl: 'http://192.168.1.50:7912',
    theme: opts.theme,
    lang: opts.lang,
    slotSpools: {}
  }
  const allPrinters = [
    { name: 'Snapmaker U1', host: '192.168.1.42', port: 7125 },
    { name: 'Mini', host: '192.168.1.43', port: 7125 }
  ]
  const printerList = opts.printerCount != null ? allPrinters.slice(0, opts.printerCount) : allPrinters
  const config: StationConfig = {
    // Bei 0 Druckern auch den Fallback printer_host leeren, sonst zeigt die App einen Drucker.
    printer_host: printerList.length === 0 ? '' : '192.168.1.42',
    printer_port: 7125,
    spoolman_url: 'http://192.168.1.50:7912',
    device_name: 'spoolstation',
    enc_reverse: false,
    read_timeout_ms: 10000,
    lang: opts.lang,
    printers: printerList
  }

  const idleJob: NfcJob = { job_id: 0, kind: 'read', state: 'idle' }

  return {
    settings: {
      get: async (): Promise<AppSettings> => settings,
      set: async (patch: Partial<AppSettings>): Promise<AppSettings> => {
        settings = { ...settings, ...patch }
        return settings
      }
    },
    system: {
      initialLanguage: async (): Promise<{ registry: string | null; locale: string }> => ({ registry: null, locale: 'de-DE' }),
      updateSource: async (): Promise<{ owner: string; repo: string; configured: boolean }> => ({ owner: 'schmutzskuz', repo: 'spoolstation', configured: true }),
      openExternal: async (): Promise<void> => {}
    },
    discover: async () => [{ name: 'spoolstation', host: '192.168.1.60', port: 80 }],
    station: {
      status: async () => ok(stationStatus),
      getConfig: async () => ok({ ...config }),
      putConfig: async (_t: unknown, patch: Partial<StationConfig>) => {
        Object.assign(config, patch)
        return ok({ ...config })
      },
      nfcRead: async () => ok({ job_id: 1 }),
      nfcWrite: async () => ok({ job_id: 2 }),
      nfcJob: async () => ok(idleJob),
      nfcCancel: async () => ok({ ok: true }),
      printerSend: async () => ok({ ok: true, http_status: 200, response: '{"state":"success"}' })
    },
    spoolman: {
      info: async () => ok({ version: '0.22.1' }),
      listSpools: async () => ok(spools.map((s) => ({ ...s }))),
      getSpool: async (_u: string, id: number) => ok(spools.find((s) => s.id === id) as SpoolmanSpool),
      patchSpool: async (_u: string, id: number) => ok(spools.find((s) => s.id === id) as SpoolmanSpool),
      createSpool: async () => ok(spools[0]),
      deleteSpool: async () => ok({}),
      useSpool: async (_u: string, id: number) => ok(spools.find((s) => s.id === id) as SpoolmanSpool),
      measureSpool: async (_u: string, id: number) => ok(spools.find((s) => s.id === id) as SpoolmanSpool),
      listFilaments: async () => ok(filaments.map((f) => ({ ...f }))),
      getFilament: async (_u: string, id: number) => ok(fil(id)),
      createFilament: async () => ok(filaments[0]),
      patchFilament: async (_u: string, id: number) => ok(fil(id)),
      deleteFilament: async () => ok({}),
      listVendors: async () => ok(vendors.map((v) => ({ ...v }))),
      getVendor: async (_u: string, id: number) => ok(vendor(id)),
      patchVendor: async (_u: string, id: number) => ok(vendor(id)),
      deleteVendor: async () => ok({}),
      ensureVendor: async () => ok(1),
      listFields: async (_u: string, entity: string) =>
        ok(entity === 'spool' ? spoolFields : entity === 'filament' ? filamentFields : vendorFields),
      externalFilaments: async () => ok(externalFilaments),
      ensureFields: async () => ok({ ok: true as const }),
      linkCard: async () => ok({ changed: 1 }),
      findSpoolByUid: async () => ok(spools[0])
    },
    update: {
      getState: async (): Promise<AppUpdateState> => ({
        status: 'idle',
        configured: true,
        packaged: true,
        version: APP_VERSION,
        channel: 'stable',
        autoCheck: true
      }),
      check: async (): Promise<void> => {},
      install: async (): Promise<void> => {},
      setAuto: async (on: boolean): Promise<AppUpdateState> => ({
        status: 'idle', configured: true, packaged: true, version: APP_VERSION, channel: 'stable', autoCheck: on
      }),
      setChannel: async (c: 'stable' | 'beta'): Promise<AppUpdateState> => ({
        status: 'idle', configured: true, packaged: true, version: APP_VERSION, channel: c, autoCheck: true
      }),
      onState: (_cb: (s: AppUpdateState) => void): (() => void) => () => {}
    },
    fw: {
      info: async (): Promise<FwInfo> => ({
        configured: true,
        expectedApi: STATION_API_VERSION,
        bundled: null,
        latest: null
      }),
      pickFile: async (): Promise<string | null> => null,
      update: async (): Promise<void> => {},
      onProgress: (_cb: (p: FwProgress) => void): (() => void) => () => {}
    },
    printer: {
      query: async (t: { host: string }) =>
        ok(t.host === '192.168.1.43' ? MINI_SLOTS.map((s) => ({ ...s })) : U1_SLOTS.map((s) => ({ ...s }))),
      state: async (t: { host: string }) =>
        ok(
          t.host === '192.168.1.43'
            ? { reachable: true, state: 'standby' as const }
            : { reachable: true, state: 'printing' as const, filename: 'drache_v3.gcode', progress: 42 }
        ),
      assign: async () => ok({ response: '{"state":"success"}' }),
      clearSlot: async () => ok({ response: 'ok' })
    }
  }
}

export function installMockApi(opts: MockOpts): void {
  ;(window as unknown as { api: unknown }).api = createMockApi(opts)
}
