import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import i18n, { normalizeLang } from '@/i18n'
import type {
  AppSettings,
  IpcResult,
  PrinterDef,
  PrinterTarget,
  StationConfig,
  StationStatus,
  StationTarget
} from '../../../shared/types'

interface ConnectionState {
  settings: AppSettings
  loaded: boolean
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>

  target: StationTarget
  status: StationStatus | null
  connected: boolean
  checking: boolean
  error: string | null

  spoolmanConnected: boolean
  spoolmanVersion: string | null

  // Drucker (aus der Stationskonfiguration)
  printers: PrinterDef[]
  configLoaded: boolean // true, sobald /api/config einmal beantwortet wurde
  printerStatus: boolean[] // pro Drucker verbunden?
  printersConnected: number
  activePrinter: number
  setActivePrinter: (i: number) => void
  printerTarget: PrinterTarget | null // aktiver Drucker (Kompatibilitaet)
  printerConnected: boolean
  savePrinters: (list: PrinterDef[]) => Promise<IpcResult<StationConfig>>

  refresh: () => Promise<void>
}

const ConnectionCtx = createContext<ConnectionState | null>(null)

const FALLBACK: AppSettings = {
  stationHost: '',
  apiKey: '',
  spoolmanUrl: '',
  theme: 'dark',
  slotSpools: {}
}

function printersFromConfig(cfg: StationConfig): PrinterDef[] {
  if (cfg.printers && cfg.printers.length > 0) return cfg.printers
  if (cfg.printer_host) return [{ name: 'Drucker', host: cfg.printer_host, port: cfg.printer_port || 7125 }]
  return []
}

export function ConnectionProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [settings, setSettings] = useState<AppSettings>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<StationStatus | null>(null)
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [spoolmanConnected, setSpoolmanConnected] = useState(false)
  const [spoolmanVersion, setSpoolmanVersion] = useState<string | null>(null)

  const [printers, setPrinters] = useState<PrinterDef[]>([])
  const [configLoaded, setConfigLoaded] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<boolean[]>([])
  const [activePrinter, setActivePrinterState] = useState(0)

  const target: StationTarget = { host: settings.stationHost, apiKey: settings.apiKey }
  const targetRef = useRef(target)
  targetRef.current = target
  const spoolmanUrlRef = useRef(settings.spoolmanUrl)
  spoolmanUrlRef.current = settings.spoolmanUrl
  const printersRef = useRef(printers)
  printersRef.current = printers
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const saveSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const updated = await window.api.settings.set(patch)
    setSettings(updated)
  }, [])

  // Druckerwahl: setzt den aktiven Drucker und merkt ihn per Host dauerhaft.
  const setActivePrinter = useCallback(
    (i: number) => {
      setActivePrinterState(i)
      const p = printersRef.current[i]
      if (p) void saveSettings({ lastPrinterHost: p.host })
    },
    [saveSettings]
  )

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [settings.theme])

  // Sprache: gespeicherte Einstellung -> Installer-Registry -> Systemsprache -> en
  const langResolved = useRef(false)
  useEffect(() => {
    if (!loaded || langResolved.current) return
    langResolved.current = true
    ;(async () => {
      if (settings.lang) {
        i18n.changeLanguage(settings.lang)
        return
      }
      const init = await window.api.system.initialLanguage()
      const pick = normalizeLang(init.registry) || normalizeLang(init.locale) || 'en'
      i18n.changeLanguage(pick)
      await saveSettings({ lang: pick })
    })()
  }, [loaded, settings.lang, saveSettings])

  // Sprachwechsel sofort anwenden und (best effort) an die Station senden
  const lastSentLang = useRef<string | null>(null)
  useEffect(() => {
    if (!settings.lang) return
    i18n.changeLanguage(settings.lang)
    if (targetRef.current.host && lastSentLang.current !== settings.lang) {
      lastSentLang.current = settings.lang
      window.api.station.putConfig(targetRef.current, { lang: settings.lang })
    }
  }, [settings.lang])

  useEffect(() => {
    let active = true
    window.api.settings.get().then((s) => {
      if (!active) return
      setSettings(s)
      setLoaded(true)
    })
    return () => {
      active = false
    }
  }, [])

  const refresh = useCallback(async () => {
    const t = targetRef.current

    if (t.host) {
      setChecking(true)
      const res = await window.api.station.status(t)
      if (res.ok && res.data) {
        setStatus(res.data)
        setConnected(true)
        setError(null)
      } else {
        setStatus(null)
        setConnected(false)
        setError(res.error || 'Nicht verbunden')
      }
      setChecking(false)

      const cfg = await window.api.station.getConfig(t)
      if (cfg.ok && cfg.data) {
        const list = printersFromConfig(cfg.data)
        setPrinters(list)
        // Zuletzt gewaehlten Drucker (per Host) wiederherstellen, sonst clampen.
        const want = settingsRef.current.lastPrinterHost
        const idx = want ? list.findIndex((p) => p.host === want) : -1
        setActivePrinterState((p) => (idx >= 0 ? idx : p < list.length ? p : 0))
      }
      // Markiert den ersten abgeschlossenen Config-Abruf, damit Formulare
      // zwischen "noch am Laden" und "wirklich leer" unterscheiden koennen.
      setConfigLoaded(true)
    } else {
      setStatus(null)
      setConnected(false)
      setError(null)
      setPrinters([])
      setConfigLoaded(false)
    }

    const url = spoolmanUrlRef.current
    if (url) {
      const info = await window.api.spoolman.info(url)
      if (info.ok && info.data) {
        setSpoolmanConnected(true)
        setSpoolmanVersion(info.data.version)
      } else {
        setSpoolmanConnected(false)
        setSpoolmanVersion(null)
      }
    } else {
      setSpoolmanConnected(false)
      setSpoolmanVersion(null)
    }
  }, [])

  // Status jedes Druckers pollen
  useEffect(() => {
    let active = true
    async function ping(): Promise<void> {
      const list = printersRef.current
      if (list.length === 0) {
        if (active) setPrinterStatus([])
        return
      }
      const results = await Promise.all(list.map((p) => window.api.printer.query({ host: p.host, port: p.port })))
      if (active) setPrinterStatus(results.map((r) => r.ok))
    }
    ping()
    const id = setInterval(ping, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [printers])

  useEffect(() => {
    if (!loaded) return
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [loaded, settings.stationHost, settings.apiKey, settings.spoolmanUrl, refresh])

  const savePrinters = useCallback(
    async (list: PrinterDef[]): Promise<IpcResult<StationConfig>> => {
      const res = await window.api.station.putConfig(targetRef.current, { printers: list })
      if (res.ok && res.data) {
        const next = printersFromConfig(res.data)
        setPrinters(next)
        setActivePrinterState((p) => (p < next.length ? p : 0))
      }
      return res
    },
    []
  )

  const printerTarget: PrinterTarget | null =
    printers[activePrinter] ? { host: printers[activePrinter].host, port: printers[activePrinter].port } : null
  const printerConnected = !!printerStatus[activePrinter]
  const printersConnected = printerStatus.filter(Boolean).length

  return (
    <ConnectionCtx.Provider
      value={{
        settings,
        loaded,
        saveSettings,
        target,
        status,
        connected,
        checking,
        error,
        spoolmanConnected,
        spoolmanVersion,
        printers,
        configLoaded,
        printerStatus,
        printersConnected,
        activePrinter,
        setActivePrinter,
        printerTarget,
        printerConnected,
        savePrinters,
        refresh
      }}
    >
      {children}
    </ConnectionCtx.Provider>
  )
}

export function useConnection(): ConnectionState {
  const ctx = useContext(ConnectionCtx)
  if (!ctx) throw new Error('useConnection muss innerhalb von ConnectionProvider verwendet werden')
  return ctx
}
