import { app, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type Store from 'electron-store'
import { loadUpdateSource } from './updateConfig'
import type { AppSettings, AppUpdateState } from '../shared/types'

const { autoUpdater } = electronUpdater

// 6 Stunden zwischen den automatischen Pruefungen (Vorgabe aus der Spezifikation).
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let getWindow: () => BrowserWindow | null = () => null
let store: Store<AppSettings>
let timer: ReturnType<typeof setInterval> | null = null

const source = loadUpdateSource()

const state: AppUpdateState = {
  status: source.configured ? 'idle' : 'disabled',
  configured: source.configured,
  packaged: app.isPackaged,
  version: app.getVersion(),
  channel: 'stable',
  autoCheck: true
}

function push(): void {
  getWindow()?.webContents.send('update:app', state)
}

// Technische Fehler in verstaendliche Codes uebersetzen (Renderer uebersetzt sie).
function friendlyError(e: unknown): string {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase()
  if (/enotfound|getaddrinfo|econnrefused|econnreset|etimedout|network|net::/.test(m)) return 'offline'
  if (/rate limit|403/.test(m)) return 'rate-limit'
  if (/404|no published|cannot find|latest\.yml/.test(m)) return 'no-release'
  if (/sha|checksum|integrity|hash/.test(m)) return 'corrupt'
  return 'generic'
}

function normalizeNotes(notes: unknown): string | undefined {
  if (!notes) return undefined
  if (typeof notes === 'string') return notes.replace(/<[^>]+>/g, '').trim() || undefined
  if (Array.isArray(notes)) {
    return (
      notes
        .map((n) => (typeof n === 'string' ? n : (n?.note ?? '')))
        .filter(Boolean)
        .join('\n\n')
        .replace(/<[^>]+>/g, '')
        .trim() || undefined
    )
  }
  return undefined
}

function applySettings(s: AppSettings): void {
  state.autoCheck = s.updateAutoCheck !== false
  state.channel = s.updateChannel === 'beta' ? 'beta' : 'stable'
  autoUpdater.allowPrerelease = state.channel === 'beta'
}

// Pruefung ausloesen (robust: Fehler werden abgefangen, nichts stuerzt ab).
async function check(manual: boolean): Promise<void> {
  if (!state.configured) return
  if (!app.isPackaged) {
    // electron-updater laeuft nur im installierten Programm.
    state.status = manual ? 'not-available' : 'idle'
    push()
    return
  }
  try {
    state.status = 'checking'
    state.error = undefined
    push()
    await autoUpdater.checkForUpdates()
  } catch (e) {
    state.status = 'error'
    state.error = friendlyError(e)
    push()
  }
}

export function initUpdater(win: () => BrowserWindow | null, s: Store<AppSettings>): void {
  getWindow = win
  store = s
  applySettings(store.store)

  if (!state.configured) {
    push()
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.setFeedURL({ provider: 'github', owner: source.owner, repo: source.repo })
  // Eigenes Logging aus, Fehler behandeln wir selbst.
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => {
    state.status = 'checking'
    push()
  })
  autoUpdater.on('update-available', (info) => {
    state.status = 'available'
    state.newVersion = info.version
    state.notes = normalizeNotes(info.releaseNotes)
    state.progress = 0
    push()
  })
  autoUpdater.on('update-not-available', () => {
    state.status = 'not-available'
    state.newVersion = undefined
    push()
  })
  autoUpdater.on('download-progress', (p) => {
    state.status = 'downloading'
    state.progress = Math.round(p.percent)
    push()
  })
  autoUpdater.on('update-downloaded', (info) => {
    state.status = 'downloaded'
    state.newVersion = info.version
    state.notes = normalizeNotes(info.releaseNotes)
    state.progress = 100
    push()
  })
  autoUpdater.on('error', (e) => {
    state.status = 'error'
    state.error = friendlyError(e)
    push()
  })

  push()

  // Beim Start pruefen (etwas verzoegert) + alle 6 Stunden, wenn aktiviert.
  if (state.autoCheck) {
    setTimeout(() => void check(false), 4000)
  }
  startTimer()
}

function startTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
  if (state.autoCheck && state.configured) {
    timer = setInterval(() => void check(false), CHECK_INTERVAL_MS)
  }
}

export function getAppUpdateState(): AppUpdateState {
  return state
}

export function checkNow(): Promise<void> {
  return check(true)
}

export function installUpdate(): void {
  if (state.status === 'downloaded') {
    // true, true = Programm beenden und das Setup still ausfuehren.
    autoUpdater.quitAndInstall(true, true)
  }
}

export function setAutoCheck(on: boolean): AppUpdateState {
  store.set({ ...store.store, updateAutoCheck: on })
  state.autoCheck = on
  startTimer()
  if (on) void check(false)
  push()
  return state
}

export function setChannel(channel: 'stable' | 'beta'): AppUpdateState {
  store.set({ ...store.store, updateChannel: channel })
  state.channel = channel
  autoUpdater.allowPrerelease = channel === 'beta'
  push()
  if (state.configured) void check(false)
  return state
}
