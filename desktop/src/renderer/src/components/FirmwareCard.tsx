import { useEffect, useRef, useState } from 'react'
import { Download, FileUp, RotateCw, CheckCircle2, AlertTriangle, XCircle, Usb } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { useUpdater } from '@/context/UpdaterContext'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui'
import type { FwProgress } from '../../../shared/types'

// Firmware-Update der Station (OTA): zeigt aktuelle/neue Version, Kompatibilitaet,
// laedt ota.bin aus dem Release (oder mitgeliefert/Datei) hoch und begleitet den
// Neustart. Teil der Station-Seite.
export function FirmwareCard({
  target,
  connected,
  onUsbUpdate
}: {
  target: { host: string; apiKey: string }
  connected: boolean
  onUsbUpdate?: () => void // oeffnet den Assistenten im Firmware-Update-Modus (USB)
}): JSX.Element {
  const { t } = useTranslation()
  const { status, refresh } = useConnection()
  const { fw, fwLoading, refreshFw, station, apiMismatch } = useUpdater()

  const [prog, setProg] = useState<FwProgress | null>(null)
  const running = !!prog && prog.phase !== 'done' && prog.phase !== 'error'
  const offProgress = useRef<() => void>()

  useEffect(() => {
    offProgress.current = window.api.fw.onProgress((p) => {
      setProg(p)
      if (p.phase === 'done') {
        refresh()
        refreshFw()
      }
    })
    return () => offProgress.current?.()
  }, [refresh, refreshFw])

  function errText(code?: string): string {
    const known = [
      'offline',
      'rate-limit',
      'no-release',
      'corrupt',
      'generic',
      'unauthorized',
      'station-rejected',
      'no-ota-endpoint',
      'no-reboot'
    ]
    return t(`update.err.${known.includes(code || '') ? code : 'generic'}`)
  }

  // Station unterstuetzt OTA erst, wenn sie api_version meldet (ab FW 0.9.1).
  // Alte Firmware (0.9.0) kennt den Endpunkt nicht -> nur USB-Update moeglich.
  const otaSupported = typeof status?.api_version === 'number'
  const needsUsb =
    connected &&
    (!otaSupported || (prog?.phase === 'error' && prog.message === 'no-ota-endpoint'))

  async function start(source: 'auto' | 'file'): Promise<void> {
    if (!target.host) return
    setProg({ phase: 'prepare', pct: 0 })

    if (source === 'file') {
      const filePath = await window.api.fw.pickFile()
      if (!filePath) {
        setProg(null)
        return
      }
      if (!window.confirm(t('update.fileWarning'))) {
        setProg(null)
        return
      }
      await window.api.fw.update({ host: target.host, apiKey: target.apiKey, source: 'file', filePath })
      return
    }

    // auto: Release bevorzugen, sonst mitgelieferte Firmware
    const src = station.source || (fw?.latest ? 'latest' : 'bundled')
    if (src === 'latest' && fw?.latest) {
      await window.api.fw.update({
        host: target.host,
        apiKey: target.apiKey,
        source: 'latest',
        downloadUrl: fw.latest.downloadUrl,
        sha256: fw.latest.sha256,
        version: fw.latest.version
      })
    } else {
      await window.api.fw.update({ host: target.host, apiKey: target.apiKey, source: 'bundled' })
    }
  }

  const phaseLabel = prog ? t(`update.phase.${prog.phase}`) : ''
  const bundledOnly = !!fw && (!fw.configured || !!fw.error) && !!fw.bundled

  return (
    <Card id="firmware-card" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t('update.fwTitle')}</CardTitle>
        <CardDescription>{t('update.fwDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected && <Alert>{t('station.connectFirst')}</Alert>}

        {connected && (
          <>
            {/* Versionen */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span>
                {t('update.currentVersion')}: <span className="font-medium">v{status?.version || '–'}</span>
              </span>
              {!needsUsb && fw?.latest && (
                <span className="text-muted-foreground">
                  {t('update.releaseVersion')}: v{fw.latest.version}
                </span>
              )}
              {!needsUsb && fw?.bundled && (
                <span className="text-muted-foreground">
                  {t('update.bundledVersion')}: v{fw.bundled.version}
                </span>
              )}
            </div>

            {/* Alte Firmware ohne OTA-Endpunkt -> nur USB-Update moeglich */}
            {needsUsb ? (
              <>
                <Alert variant="warning">
                  <span className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {t('update.otaUnsupported')}
                  </span>
                </Alert>
                <Button onClick={onUsbUpdate}>
                  <Usb className="h-4 w-4" /> {t('update.usbUpdateBtn')}
                </Button>
              </>
            ) : (
              <>
                {/* Kompatibilitaetshinweis App <-> Station */}
                {apiMismatch.mismatch && (
                  <Alert variant="warning">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {t('update.apiMismatch', {
                        station: apiMismatch.stationApi ?? '?',
                        app: apiMismatch.appApi
                      })}
                    </span>
                  </Alert>
                )}

                {/* Update-Quelle nicht eingerichtet */}
                {fw && !fw.configured && !fw.bundled && <Alert>{t('update.notConfigured')}</Alert>}

                {/* Noch kein Online-Release -> neutrale Info (kein Warnton) */}
                {bundledOnly && fw?.error === 'no-release' && (
                  <div className="text-sm text-muted-foreground">{t('update.noOnlineRelease')}</div>
                )}
                {/* Andere Abrufprobleme (offline/Limit) -> Warnung */}
                {bundledOnly && fw?.error && fw.error !== 'no-release' && (
                  <Alert variant="warning">{t('update.offlineBundled', { msg: errText(fw.error) })}</Alert>
                )}

                {/* Update-Status */}
                {station.available ? (
                  <Alert>
                    <span className="flex items-center gap-2">
                      <Download className="h-4 w-4 shrink-0" />
                      {t('update.fwAvailable', { from: station.from, to: station.to })}
                      {station.source === 'bundled' && (
                        <Badge variant="muted">{t('update.sourceBundled')}</Badge>
                      )}
                    </span>
                  </Alert>
                ) : (
                  !fwLoading &&
                  fw &&
                  (fw.latest || fw.bundled) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t('update.fwUpToDate')}
                    </div>
                  )
                )}

                {fw?.latest?.notes && station.available && station.source === 'latest' && (
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                    {fw.latest.notes}
                  </pre>
                )}

                {/* Fortschritt */}
                {prog && prog.phase !== 'error' && prog.phase !== 'done' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{phaseLabel}</span>
                      {prog.phase === 'upload' && <span>{prog.pct}%</span>}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-border">
                      <div
                        className={
                          'h-full bg-primary transition-all ' +
                          (prog.phase === 'upload' ? '' : 'animate-pulse')
                        }
                        style={{ width: prog.phase === 'upload' ? `${prog.pct}%` : '100%' }}
                      />
                    </div>
                  </div>
                )}

                {/* Ergebnis */}
                {prog?.phase === 'done' && prog.result === 'success' && (
                  <Alert variant="default">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {t('update.fwDone', { version: prog.newVersion || '' })}
                    </span>
                  </Alert>
                )}
                {prog?.phase === 'done' && prog.result === 'rolled_back' && (
                  <Alert variant="warning">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {t('update.fwRolledBack', { version: prog.newVersion || '' })}
                    </span>
                  </Alert>
                )}
                {prog?.phase === 'error' && (
                  <Alert variant="danger">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 shrink-0" />
                      {errText(prog.message)}
                    </span>
                  </Alert>
                )}

                {/* Aktionen */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => start('auto')} disabled={running || !station.available} loading={running}>
                    <Download className="h-4 w-4" />
                    {station.to ? t('update.fwUpdateTo', { version: station.to }) : t('update.fwUpdateBtn')}
                  </Button>
                  <Button variant="outline" onClick={() => start('file')} disabled={running}>
                    <FileUp className="h-4 w-4" /> {t('update.chooseFile')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={refreshFw} disabled={running || fwLoading} loading={fwLoading}>
                    <RotateCw className="h-4 w-4" /> {t('update.checkFw')}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
