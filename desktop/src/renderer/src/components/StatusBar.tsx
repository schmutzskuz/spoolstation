import { RefreshCw, ArrowUpCircle, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { useUpdater } from '@/context/UpdaterContext'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { PageId } from '@/components/Sidebar'

function Dot({ label, ok, muted }: { label: string; ok: boolean; muted?: boolean }): JSX.Element {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          muted ? 'bg-muted-foreground/50' : ok ? 'bg-success' : 'bg-destructive'
        )}
      />
      <span className={muted ? 'text-muted-foreground' : undefined}>{label}</span>
    </span>
  )
}

export function StatusBar({
  onNavigateSection
}: {
  onNavigateSection?: (page: PageId, anchor: string) => void
} = {}): JSX.Element {
  const { t } = useTranslation()
  const { status, connected, checking, error, settings, spoolmanConnected, printers, printersConnected, refresh } = useConnection()
  const { station, apiMismatch, app } = useUpdater()
  const appUpdate = app && ['available', 'downloading', 'downloaded'].includes(app.status) && app.newVersion
  const printerLabel =
    printers.length === 0
      ? t('status.printer')
      : printers.length === 1
        ? printers[0].name || t('status.printer')
        : t('status.printerCount', { connected: printersConnected, total: printers.length })

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <Dot label={t('status.station')} ok={connected} />
        <Dot label={printerLabel} ok={printersConnected > 0} muted={printers.length === 0} />
        <Dot label={t('status.spoolman')} ok={spoolmanConnected} />
        <Dot label={t('status.nfc')} ok={!!status?.nfc_ok} muted={!connected} />

        {connected && status ? (
          <span className="text-sm text-muted-foreground">
            {status.name} {status.ip} v{status.version}
          </span>
        ) : !settings.stationHost ? (
          <span className="text-sm text-muted-foreground">{t('status.noStation')}</span>
        ) : error ? (
          <span className="text-sm text-muted-foreground">{error}</span>
        ) : null}

        {connected && station.available && (
          <button
            className="flex items-center gap-1 rounded text-sm text-primary hover:underline"
            title={t('update.fwTip', { from: station.from, to: station.to })}
            onClick={() => onNavigateSection?.('station', 'firmware-card')}
          >
            <ArrowUpCircle className="h-3.5 w-3.5" /> {t('status.fwUpdate')}
          </button>
        )}
        {appUpdate && (
          <button
            className="flex items-center gap-1 rounded text-sm text-primary hover:underline"
            title={t('update.appTip', { from: app!.version, to: app!.newVersion })}
            onClick={() => onNavigateSection?.('einstellungen', 'update-settings')}
          >
            <ArrowUpCircle className="h-3.5 w-3.5" /> {t('status.appUpdate')}
          </button>
        )}
        {connected && apiMismatch.mismatch && (
          <button
            className="flex items-center gap-1 rounded text-sm text-warning hover:underline"
            title={t('update.apiMismatch', { station: apiMismatch.stationApi ?? '?', app: apiMismatch.appApi })}
            onClick={() => onNavigateSection?.('station', 'firmware-card')}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> {t('status.apiMismatch')}
          </button>
        )}
      </div>

      <Button variant="ghost" size="sm" onClick={refresh} loading={checking}>
        <RefreshCw className="h-4 w-4" /> {t('common.refresh')}
      </Button>
    </header>
  )
}
