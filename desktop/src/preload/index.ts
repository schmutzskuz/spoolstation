import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  AppUpdateState,
  DiscoveredStation,
  EntityType,
  ExternalFilament,
  FwInfo,
  FwProgress,
  FwUpdateOptions,
  IpcResult,
  NfcJob,
  OpenSpool,
  PrinterSendResult,
  PrinterState,
  PrinterTarget,
  SlotInfo,
  SpoolmanField,
  SpoolmanFilament,
  SpoolmanInfo,
  SpoolmanSpool,
  SpoolmanVendor,
  StationConfig,
  StationStatus,
  StationTarget
} from '../shared/types'

const api = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:set', patch)
  },
  system: {
    initialLanguage: (): Promise<{ registry: string | null; locale: string }> =>
      ipcRenderer.invoke('system:initialLanguage'),
    updateSource: (): Promise<{ owner: string; repo: string; configured: boolean }> =>
      ipcRenderer.invoke('system:updateSource'),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('system:openExternal', url)
  },
  firmware: {
    get: (): Promise<{ ok: boolean; version?: string; api_version?: number; dataBase64?: string; error?: string }> =>
      ipcRenderer.invoke('firmware:get'),
    getOta: (): Promise<{ ok: boolean; version?: string; api_version?: number; dataBase64?: string; error?: string }> =>
      ipcRenderer.invoke('firmware:getOta')
  },
  discover: (timeoutMs?: number): Promise<DiscoveredStation[]> =>
    ipcRenderer.invoke('station:discover', timeoutMs),
  station: {
    status: (t: StationTarget): Promise<IpcResult<StationStatus>> =>
      ipcRenderer.invoke('station:status', t),
    getConfig: (t: StationTarget): Promise<IpcResult<StationConfig>> =>
      ipcRenderer.invoke('station:getConfig', t),
    putConfig: (t: StationTarget, config: Partial<StationConfig>): Promise<IpcResult<StationConfig>> =>
      ipcRenderer.invoke('station:putConfig', t, config),
    nfcRead: (t: StationTarget, timeoutMs?: number): Promise<IpcResult<{ job_id: number }>> =>
      ipcRenderer.invoke('station:nfcRead', t, timeoutMs),
    nfcWrite: (
      t: StationTarget,
      openspool: OpenSpool,
      timeoutMs?: number
    ): Promise<IpcResult<{ job_id: number }>> =>
      ipcRenderer.invoke('station:nfcWrite', t, openspool, timeoutMs),
    nfcJob: (t: StationTarget): Promise<IpcResult<NfcJob>> =>
      ipcRenderer.invoke('station:nfcJob', t),
    nfcCancel: (t: StationTarget): Promise<IpcResult<{ ok: boolean }>> =>
      ipcRenderer.invoke('station:nfcCancel', t),
    printerSend: (
      t: StationTarget,
      channel: number,
      openspool: OpenSpool,
      uid: string
    ): Promise<IpcResult<PrinterSendResult>> =>
      ipcRenderer.invoke('station:printerSend', t, channel, openspool, uid)
  },
  spoolman: {
    info: (url: string): Promise<IpcResult<SpoolmanInfo>> => ipcRenderer.invoke('spoolman:info', url),
    listSpools: (url: string): Promise<IpcResult<SpoolmanSpool[]>> =>
      ipcRenderer.invoke('spoolman:listSpools', url),
    getSpool: (url: string, id: number): Promise<IpcResult<SpoolmanSpool>> =>
      ipcRenderer.invoke('spoolman:getSpool', url, id),
    patchSpool: (url: string, id: number, body: Record<string, unknown>): Promise<IpcResult<SpoolmanSpool>> =>
      ipcRenderer.invoke('spoolman:patchSpool', url, id, body),
    createSpool: (url: string, body: Record<string, unknown>): Promise<IpcResult<SpoolmanSpool>> =>
      ipcRenderer.invoke('spoolman:createSpool', url, body),
    deleteSpool: (url: string, id: number): Promise<IpcResult<unknown>> =>
      ipcRenderer.invoke('spoolman:deleteSpool', url, id),
    useSpool: (url: string, id: number, useWeight: number): Promise<IpcResult<SpoolmanSpool>> =>
      ipcRenderer.invoke('spoolman:useSpool', url, id, useWeight),
    measureSpool: (url: string, id: number, grossWeight: number): Promise<IpcResult<SpoolmanSpool>> =>
      ipcRenderer.invoke('spoolman:measureSpool', url, id, grossWeight),
    listFilaments: (url: string): Promise<IpcResult<SpoolmanFilament[]>> =>
      ipcRenderer.invoke('spoolman:listFilaments', url),
    getFilament: (url: string, id: number): Promise<IpcResult<SpoolmanFilament>> =>
      ipcRenderer.invoke('spoolman:getFilament', url, id),
    createFilament: (url: string, body: Record<string, unknown>): Promise<IpcResult<SpoolmanFilament>> =>
      ipcRenderer.invoke('spoolman:createFilament', url, body),
    patchFilament: (url: string, id: number, body: Record<string, unknown>): Promise<IpcResult<SpoolmanFilament>> =>
      ipcRenderer.invoke('spoolman:patchFilament', url, id, body),
    deleteFilament: (url: string, id: number): Promise<IpcResult<unknown>> =>
      ipcRenderer.invoke('spoolman:deleteFilament', url, id),
    listVendors: (url: string): Promise<IpcResult<SpoolmanVendor[]>> =>
      ipcRenderer.invoke('spoolman:listVendors', url),
    getVendor: (url: string, id: number): Promise<IpcResult<SpoolmanVendor>> =>
      ipcRenderer.invoke('spoolman:getVendor', url, id),
    patchVendor: (url: string, id: number, body: Record<string, unknown>): Promise<IpcResult<SpoolmanVendor>> =>
      ipcRenderer.invoke('spoolman:patchVendor', url, id, body),
    deleteVendor: (url: string, id: number): Promise<IpcResult<unknown>> =>
      ipcRenderer.invoke('spoolman:deleteVendor', url, id),
    ensureVendor: (url: string, name: string): Promise<IpcResult<number>> =>
      ipcRenderer.invoke('spoolman:ensureVendor', url, name),
    listFields: (url: string, entity: EntityType): Promise<IpcResult<SpoolmanField[]>> =>
      ipcRenderer.invoke('spoolman:listFields', url, entity),
    externalFilaments: (url: string): Promise<IpcResult<ExternalFilament[]>> =>
      ipcRenderer.invoke('spoolman:externalFilaments', url),
    ensureFields: (url: string): Promise<IpcResult<{ ok: true }>> =>
      ipcRenderer.invoke('spoolman:ensureFields', url),
    linkCard: (url: string, spoolId: number, uidHex: string): Promise<IpcResult<{ changed: number }>> =>
      ipcRenderer.invoke('spoolman:linkCard', url, spoolId, uidHex),
    findSpoolByUid: (url: string, uidHex: string): Promise<IpcResult<SpoolmanSpool | null>> =>
      ipcRenderer.invoke('spoolman:findSpoolByUid', url, uidHex)
  },
  update: {
    getState: (): Promise<AppUpdateState> => ipcRenderer.invoke('update:getAppState'),
    check: (): Promise<void> => ipcRenderer.invoke('update:check'),
    install: (): Promise<void> => ipcRenderer.invoke('update:install'),
    setAuto: (on: boolean): Promise<AppUpdateState> => ipcRenderer.invoke('update:setAuto', on),
    setChannel: (c: 'stable' | 'beta'): Promise<AppUpdateState> =>
      ipcRenderer.invoke('update:setChannel', c),
    // Live-Zustand abonnieren; gibt eine Abmelde-Funktion zurueck.
    onState: (cb: (s: AppUpdateState) => void): (() => void) => {
      const l = (_e: unknown, s: AppUpdateState): void => cb(s)
      ipcRenderer.on('update:app', l)
      return () => ipcRenderer.removeListener('update:app', l)
    }
  },
  fw: {
    info: (): Promise<FwInfo> => ipcRenderer.invoke('fw:info'),
    pickFile: (): Promise<string | null> => ipcRenderer.invoke('fw:pickFile'),
    update: (
      opts: FwUpdateOptions & { downloadUrl?: string; sha256?: string; version?: string }
    ): Promise<void> => ipcRenderer.invoke('fw:update', opts),
    onProgress: (cb: (p: FwProgress) => void): (() => void) => {
      const l = (_e: unknown, p: FwProgress): void => cb(p)
      ipcRenderer.on('fw:progress', l)
      return () => ipcRenderer.removeListener('fw:progress', l)
    }
  },
  printer: {
    query: (t: PrinterTarget): Promise<IpcResult<SlotInfo[]>> => ipcRenderer.invoke('printer:query', t),
    state: (t: PrinterTarget): Promise<IpcResult<PrinterState>> => ipcRenderer.invoke('printer:state', t),
    assign: (
      t: PrinterTarget,
      channel: number,
      os: OpenSpool,
      uidHex?: string
    ): Promise<IpcResult<{ response: string }>> =>
      ipcRenderer.invoke('printer:assign', t, channel, os, uidHex),
    clearSlot: (t: PrinterTarget, channel: number): Promise<IpcResult<{ response: string }>> =>
      ipcRenderer.invoke('printer:clearSlot', t, channel)
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
