// Gemeinsame Typen fuer Main-, Preload- und Renderer-Prozess.

export interface OpenSpool {
  protocol?: string
  version?: string
  brand?: string
  type?: string
  subtype?: string
  color_hex?: string
  alpha?: string
  min_temp?: string
  max_temp?: string
  bed_min_temp?: string
  bed_max_temp?: string
  spool_id?: string
}

export interface StationStatus {
  name: string
  version: string
  api_version?: number // Version der HTTP-API (Kompatibilitaetspruefung)
  ip: string
  rssi: number
  uptime_s: number
  nfc_ok: boolean
  busy: boolean
  slot: number
  last_ota?: string // "" | "success" | "rolled_back" (Ergebnis des letzten OTA)
}

export interface PrinterDef {
  name: string
  host: string
  port: number
}

export interface StationConfig {
  printer_host: string
  printer_port: number
  spoolman_url: string
  device_name: string
  enc_reverse: boolean
  read_timeout_ms: number
  lang?: string
  printers?: PrinterDef[]
}

export interface NfcJobResult {
  uid: string
  uid_len: number
  tag_type: string
  empty: boolean
  raw_json: string
  openspool?: OpenSpool
}

export interface NfcJob {
  job_id: number
  kind: string
  state: 'idle' | 'waiting' | 'done' | 'error' | 'timeout' | 'cancelled'
  error?: string
  result?: NfcJobResult
}

export interface PrinterSendResult {
  ok: boolean
  http_status: number
  response: string
}

export interface DiscoveredStation {
  name: string
  host: string
  port: number
}

export interface AppSettings {
  stationHost: string
  apiKey: string
  spoolmanUrl: string
  theme: 'dark' | 'light'
  lang?: 'de' | 'en' | 'es'
  // Zuletzt gewaehlter Drucker auf der Drucker-Seite (per Host gemerkt).
  lastPrinterHost?: string
  // Merkt sich tag-lose Zuweisungen: printer_host -> slotIndex -> spool_id
  slotSpools: Record<string, Record<string, number>>
  // Updates: automatisch pruefen (Standard an), Kanal stabil/Beta.
  updateAutoCheck?: boolean
  updateChannel?: 'stable' | 'beta'
}

/* ---------------- Updates ---------------- */
// Zustand des App-Updates (electron-updater), an den Renderer gemeldet.
export type AppUpdateStatus =
  | 'idle'
  | 'disabled' // keine Update-Quelle eingerichtet
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'

export interface AppUpdateState {
  status: AppUpdateStatus
  configured: boolean // update.config.json gesetzt?
  packaged: boolean // nur im installierten Programm aktiv
  version: string // aktuelle App-Version
  newVersion?: string
  notes?: string
  progress?: number // 0..100 beim Download
  error?: string // Fehlercode: offline | rate-limit | no-release | corrupt | generic
  channel: 'stable' | 'beta'
  autoCheck: boolean
}

// Ein Firmware-Manifest (firmware-manifest.json), auf das Noetige reduziert.
export interface FwManifestInfo {
  version: string
  api_version: number
  size: number
  sha256: string
}

export interface FwInfo {
  configured: boolean // Update-Quelle (GitHub) eingerichtet?
  expectedApi: number // api_version, die diese App erwartet
  bundled: FwManifestInfo | null // mitgelieferte Firmware
  latest: (FwManifestInfo & { notes?: string; downloadUrl?: string }) | null // neuestes Release
  error?: string // Fehlercode beim Abruf des Releases: offline | rate-limit | no-release | generic
}

export type FwPhase = 'idle' | 'prepare' | 'upload' | 'reboot' | 'verify' | 'done' | 'error'

export interface FwProgress {
  phase: FwPhase
  pct: number // 0..100
  message?: string // Fehler-/Infocode
  result?: 'success' | 'rolled_back'
  newVersion?: string
}

export type FwUpdateSource = 'latest' | 'bundled' | 'file'

export interface FwUpdateOptions {
  host: string
  apiKey: string
  source: FwUpdateSource
  filePath?: string // bei source === 'file'
}

// Einheitliches Ergebnis aller Station-Aufrufe aus dem Main-Prozess.
export interface IpcResult<T> {
  ok: boolean
  status?: number
  data?: T
  error?: string
}

export interface StationTarget {
  host: string
  apiKey: string
}

/* ---------------- Spoolman ---------------- */
export interface SpoolmanVendor {
  id: number
  name: string
  empty_spool_weight?: number
  external_id?: string
  comment?: string
  registered?: string
  extra?: Record<string, string>
}

export interface SpoolmanFilament {
  id: number
  name: string
  vendor?: SpoolmanVendor
  material?: string
  color_hex?: string
  multi_color_hexes?: string
  multi_color_direction?: string
  diameter?: number
  density?: number
  weight?: number
  spool_weight?: number
  article_number?: string
  price?: number
  comment?: string
  external_id?: string
  registered?: string
  settings_extruder_temp?: number
  settings_bed_temp?: number
  extra?: Record<string, string>
}

export interface SpoolmanSpool {
  id: number
  filament: SpoolmanFilament
  remaining_weight?: number
  used_weight?: number
  initial_weight?: number
  spool_weight?: number
  remaining_length?: number
  used_length?: number
  archived?: boolean
  location?: string
  lot_nr?: string
  price?: number
  comment?: string
  registered?: string
  first_used?: string
  last_used?: string
  extra?: Record<string, string>
}

export interface SpoolmanField {
  key: string
  name: string
  field_type: 'text' | 'integer' | 'float' | 'boolean' | 'datetime' | 'choice'
  unit?: string
  choices?: string[]
  multi_choice?: boolean
  default_value?: string
  order?: number
}

export type EntityType = 'spool' | 'filament' | 'vendor'

export interface ExternalFilament {
  id: string
  manufacturer: string
  name: string
  material: string
  density?: number
  diameter?: number
  weight?: number
  spool_weight?: number
  color_hex?: string
  extruder_temp?: number
  bed_temp?: number
  finish?: string
}

export interface SpoolmanInfo {
  version: string
}

/* ---------------- Moonraker / Drucker ---------------- */
export interface SlotInfo {
  channel: number
  present: boolean
  vendor?: string
  mainType?: string
  subType?: string
  colorHex?: string
  alpha?: string
  hotendMin?: number
  hotendMax?: number
  bedTemp?: number
  cardUid?: string // Hex, Grossbuchstaben
  spoolId?: number // direkt vom Drucker (AFC_lane.get_status), 0/undefined = keine
  name?: string // AFC_lane.filament_name (Fallback-Anzeigename)
  weight?: number // AFC_lane.weight (Fallback-Restgewicht in g)
}

export interface PrinterTarget {
  host: string
  port: number
}

// Live-Status eines Druckers (aus Moonraker print_stats / virtual_sdcard).
export interface PrinterState {
  reachable: boolean
  state: 'standby' | 'printing' | 'paused' | 'complete' | 'cancelled' | 'error' | 'unknown'
  filename?: string
  progress?: number // 0..100
  message?: string // Fehlertext bei state === 'error'
}
