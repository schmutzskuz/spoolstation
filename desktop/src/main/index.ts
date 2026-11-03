import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { execFile } from 'child_process'
import Store from 'electron-store'
import { discoverStations } from './discovery'
import * as station from './station'
import * as spoolman from './spoolman'
import * as moonraker from './moonraker'
import {
  initUpdater,
  getAppUpdateState,
  checkNow,
  installUpdate,
  setAutoCheck,
  setChannel
} from './updater'
import { fwInfo, pickOtaFile, fwUpdate } from './firmwareUpdate'
import { loadUpdateSource } from './updateConfig'
import { STATION_API_VERSION } from '../shared/version'
import type {
  AppSettings,
  FwProgress,
  FwUpdateOptions,
  OpenSpool,
  PrinterTarget,
  StationConfig,
  StationTarget
} from '../shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  stationHost: '',
  apiKey: '',
  spoolmanUrl: '',
  theme: 'dark',
  slotSpools: {},
  updateAutoCheck: true,
  updateChannel: 'stable'
}

const store = new Store<AppSettings>({ defaults: DEFAULT_SETTINGS })

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0b',
    title: 'SpoolStation',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // --- Web Serial (USB-Einrichtung der Station) ---
  const ses = mainWindow.webContents.session
  // Serielle Geraete erlauben (lokale App).
  ses.setPermissionCheckHandler((_wc, permission) => permission === 'serial' || true)
  ses.setDevicePermissionHandler((details) => details.deviceType === 'serial')
  // Portauswahl: bekannte USB-Serial-Bruecken bevorzugen (CH340/CP210x/FTDI/ESP32-S3),
  // die Liste zusaetzlich an den Renderer melden (fuer manuelle Auswahl).
  ses.on('select-serial-port', (event, portList, _wc, callback) => {
    event.preventDefault()
    mainWindow?.webContents.send('serial:ports', portList.map((p) => ({
      portId: p.portId, vendorId: p.vendorId, productId: p.productId, portName: p.portName
    })))
    const known = ['1a86', '10c4', '0403', '303a']
    const norm = (v?: string): string => (v || '').toLowerCase().padStart(4, '0')
    const pick = portList.find((p) => known.includes(norm(p.vendorId))) || portList[0]
    callback(pick ? pick.portId : '')
  })

  // electron-vite stellt im Dev-Betrieb die Renderer-URL bereit.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Liest die vom Installer in die Registry geschriebene Sprache (Windows).
function readRegistryLang(): Promise<string | null> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(null)
    execFile('reg', ['query', 'HKCU\\Software\\SpoolStation', '/v', 'Language'], (err, stdout) => {
      if (err || !stdout) return resolve(null)
      const m = stdout.match(/Language\s+REG_SZ\s+(\S+)/i)
      resolve(m ? m[1] : null)
    })
  })
}

// --- IPC: Sprache beim Erststart (Registry + Systemsprache) ---
ipcMain.handle('system:initialLanguage', async () => ({
  registry: await readRegistryLang(),
  locale: app.getLocale()
}))

// --- IPC: Update-Quelle (owner/repo) fuer die Hilfe (Link zur Bauanleitung) ---
ipcMain.handle('system:updateSource', async () => loadUpdateSource())

// --- IPC: externen Link im Standardbrowser oeffnen (nur http/https) ---
ipcMain.handle('system:openExternal', async (_e, url: string) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) await shell.openExternal(url)
})

// --- IPC: mitgelieferte Firmware fuer das USB-Flashen ---
function firmwareDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'firmware')
    : join(__dirname, '../../resources/firmware')
}

// factory.bin (komplett, ab 0x0) – fuer "komplett neu aufspielen".
ipcMain.handle('firmware:get', async () => {
  try {
    const bin = await readFile(join(firmwareDir(), 'factory.bin'))
    const manifest = JSON.parse(await readFile(join(firmwareDir(), 'firmware-manifest.json'), 'utf8'))
    return { ok: true, version: manifest.version, api_version: manifest.api_version, dataBase64: bin.toString('base64') }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

// ota.bin (nur App) – fuer "Firmware aktualisieren, Einstellungen behalten".
ipcMain.handle('firmware:getOta', async () => {
  try {
    const bin = await readFile(join(firmwareDir(), 'ota.bin'))
    const manifest = JSON.parse(await readFile(join(firmwareDir(), 'firmware-manifest.json'), 'utf8'))
    return { ok: true, version: manifest.version, api_version: manifest.api_version, dataBase64: bin.toString('base64') }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
})

function channelFromStore(): 'stable' | 'beta' {
  return store.get('updateChannel') === 'beta' ? 'beta' : 'stable'
}

// --- IPC: App-Update (electron-updater) ---
ipcMain.handle('update:getAppState', () => getAppUpdateState())
ipcMain.handle('update:check', () => checkNow())
ipcMain.handle('update:install', () => installUpdate())
ipcMain.handle('update:setAuto', (_e, on: boolean) => setAutoCheck(on))
ipcMain.handle('update:setChannel', (_e, c: 'stable' | 'beta') => setChannel(c))

// --- IPC: Firmware-Update (Station, OTA) ---
ipcMain.handle('fw:info', () => fwInfo(channelFromStore(), STATION_API_VERSION))
ipcMain.handle('fw:pickFile', () => pickOtaFile(mainWindow))
ipcMain.handle('fw:update', (_e, opts: FwUpdateOptions & { downloadUrl?: string; sha256?: string; version?: string }) =>
  fwUpdate(opts, channelFromStore(), (p: FwProgress) => mainWindow?.webContents.send('fw:progress', p))
)

// --- IPC: Einstellungen (lokal via electron-store) ---
ipcMain.handle('settings:get', () => store.store)
ipcMain.handle('settings:set', (_e, patch: Partial<AppSettings>) => {
  store.set({ ...store.store, ...patch })
  return store.store
})

// --- IPC: Station-Suche ---
ipcMain.handle('station:discover', (_e, timeoutMs?: number) => discoverStations(timeoutMs))

// --- IPC: Station-Aufrufe ---
ipcMain.handle('station:status', (_e, t: StationTarget) => station.getStatus(t))
ipcMain.handle('station:getConfig', (_e, t: StationTarget) => station.getConfig(t))
ipcMain.handle('station:putConfig', (_e, t: StationTarget, config: Partial<StationConfig>) =>
  station.putConfig(t, config)
)
ipcMain.handle('station:nfcRead', (_e, t: StationTarget, timeoutMs?: number) =>
  station.nfcRead(t, timeoutMs)
)
ipcMain.handle('station:nfcWrite', (_e, t: StationTarget, openspool: OpenSpool, timeoutMs?: number) =>
  station.nfcWrite(t, openspool, timeoutMs)
)
ipcMain.handle('station:nfcJob', (_e, t: StationTarget) => station.nfcJob(t))
ipcMain.handle('station:nfcCancel', (_e, t: StationTarget) => station.nfcCancel(t))
ipcMain.handle(
  'station:printerSend',
  (_e, t: StationTarget, channel: number, openspool: OpenSpool, uid: string) =>
    station.printerSend(t, channel, openspool, uid)
)

// --- IPC: Spoolman ---
ipcMain.handle('spoolman:info', (_e, url: string) => spoolman.info(url))
ipcMain.handle('spoolman:listSpools', (_e, url: string) => spoolman.listSpools(url))
ipcMain.handle('spoolman:getSpool', (_e, url: string, id: number) => spoolman.getSpool(url, id))
ipcMain.handle('spoolman:patchSpool', (_e, url: string, id: number, body: Record<string, unknown>) =>
  spoolman.patchSpool(url, id, body)
)
ipcMain.handle('spoolman:createSpool', (_e, url: string, body: Record<string, unknown>) =>
  spoolman.createSpool(url, body)
)
ipcMain.handle('spoolman:deleteSpool', (_e, url: string, id: number) => spoolman.deleteSpool(url, id))
ipcMain.handle('spoolman:useSpool', (_e, url: string, id: number, useWeight: number) =>
  spoolman.useSpool(url, id, useWeight)
)
ipcMain.handle('spoolman:measureSpool', (_e, url: string, id: number, grossWeight: number) =>
  spoolman.measureSpool(url, id, grossWeight)
)
ipcMain.handle('spoolman:listFilaments', (_e, url: string) => spoolman.listFilaments(url))
ipcMain.handle('spoolman:getFilament', (_e, url: string, id: number) => spoolman.getFilament(url, id))
ipcMain.handle('spoolman:createFilament', (_e, url: string, body: Record<string, unknown>) =>
  spoolman.createFilament(url, body)
)
ipcMain.handle('spoolman:patchFilament', (_e, url: string, id: number, body: Record<string, unknown>) =>
  spoolman.patchFilament(url, id, body)
)
ipcMain.handle('spoolman:deleteFilament', (_e, url: string, id: number) =>
  spoolman.deleteFilament(url, id)
)
ipcMain.handle('spoolman:listVendors', (_e, url: string) => spoolman.listVendors(url))
ipcMain.handle('spoolman:getVendor', (_e, url: string, id: number) => spoolman.getVendor(url, id))
ipcMain.handle('spoolman:patchVendor', (_e, url: string, id: number, body: Record<string, unknown>) =>
  spoolman.patchVendor(url, id, body)
)
ipcMain.handle('spoolman:deleteVendor', (_e, url: string, id: number) => spoolman.deleteVendor(url, id))
ipcMain.handle('spoolman:ensureVendor', (_e, url: string, name: string) =>
  spoolman.ensureVendor(url, name)
)
ipcMain.handle('spoolman:listFields', (_e, url: string, entity: 'spool' | 'filament' | 'vendor') =>
  spoolman.listFields(url, entity)
)
ipcMain.handle('spoolman:externalFilaments', (_e, url: string) => spoolman.externalFilaments(url))
ipcMain.handle('spoolman:ensureFields', (_e, url: string) => spoolman.ensureFields(url))
ipcMain.handle('spoolman:linkCard', (_e, url: string, spoolId: number, uidHex: string) =>
  spoolman.linkCard(url, spoolId, uidHex)
)
ipcMain.handle('spoolman:findSpoolByUid', (_e, url: string, uidHex: string) =>
  spoolman.findSpoolByUid(url, uidHex)
)

// --- IPC: Drucker (Moonraker direkt) ---
ipcMain.handle('printer:query', (_e, t: PrinterTarget) => moonraker.query(t))
ipcMain.handle('printer:state', (_e, t: PrinterTarget) => moonraker.queryState(t))
ipcMain.handle('printer:assign', (_e, t: PrinterTarget, channel: number, os: OpenSpool, uidHex?: string) =>
  moonraker.assign(t, channel, os, uidHex)
)
ipcMain.handle('printer:clearSlot', (_e, t: PrinterTarget, channel: number) =>
  moonraker.clearSlot(t, channel)
)

app.whenReady().then(() => {
  createWindow()
  initUpdater(() => mainWindow, store)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
