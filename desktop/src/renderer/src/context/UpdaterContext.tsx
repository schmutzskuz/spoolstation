import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useConnection } from '@/context/ConnectionContext'
import { STATION_API_VERSION } from '../../../shared/version'
import { decideStationUpdate, type UpdateDecision, type FwManifest } from '../../../shared/fwUpdate'
import type { AppUpdateState, FwInfo } from '../../../shared/types'

interface UpdaterState {
  // App-Update (electron-updater)
  app: AppUpdateState | null
  checkApp: () => void
  installApp: () => void
  setAuto: (on: boolean) => void
  setChannel: (c: 'stable' | 'beta') => void

  // Firmware (Station)
  fw: FwInfo | null
  fwLoading: boolean
  refreshFw: () => void
  station: UpdateDecision // steht ein Firmware-Update an?

  // Kompatibilitaet App <-> Station
  apiMismatch: { mismatch: boolean; stationApi?: number; appApi: number }
}

const Ctx = createContext<UpdaterState | null>(null)

function toManifest(m: { version: string; api_version: number; size: number; sha256: string } | null): FwManifest | null {
  return m ? { version: m.version, api_version: m.api_version, ota: { size: m.size, sha256: m.sha256 } } : null
}

export function UpdaterProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { status, connected } = useConnection()
  const [app, setApp] = useState<AppUpdateState | null>(null)
  const [fw, setFw] = useState<FwInfo | null>(null)
  const [fwLoading, setFwLoading] = useState(false)

  // App-Update-Zustand holen + live abonnieren.
  useEffect(() => {
    let active = true
    window.api.update.getState().then((s) => active && setApp(s))
    const off = window.api.update.onState((s) => setApp(s))
    return () => {
      active = false
      off()
    }
  }, [])

  const refreshFw = useCallback(() => {
    setFwLoading(true)
    window.api.fw
      .info()
      .then((info) => setFw(info))
      .finally(() => setFwLoading(false))
  }, [])

  // Firmware-Info laden: beim Start, bei Versionswechsel der Station und bei
  // Kanalwechsel (Release-Abruf haengt vom Kanal ab).
  useEffect(() => {
    refreshFw()
  }, [refreshFw, status?.version, app?.channel])

  const station = decideStationUpdate({
    stationVersion: status?.version || '',
    expectedApi: STATION_API_VERSION,
    latest: toManifest(fw?.latest ?? null),
    bundled: toManifest(fw?.bundled ?? null)
  })

  const apiMismatch = {
    appApi: STATION_API_VERSION,
    stationApi: status?.api_version,
    mismatch: !!connected && !!status && status.api_version !== STATION_API_VERSION
  }

  const value: UpdaterState = {
    app,
    checkApp: () => void window.api.update.check(),
    installApp: () => void window.api.update.install(),
    setAuto: (on) => void window.api.update.setAuto(on).then(setApp),
    setChannel: (c) => void window.api.update.setChannel(c).then(setApp),
    fw,
    fwLoading,
    refreshFw,
    station,
    apiMismatch
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUpdater(): UpdaterState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useUpdater muss innerhalb von UpdaterProvider verwendet werden')
  return ctx
}
