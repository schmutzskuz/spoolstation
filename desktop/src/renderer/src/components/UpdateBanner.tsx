import { useState } from 'react'
import { Download, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUpdater } from '@/context/UpdaterContext'
import { Button } from '@/components/ui'

// Oben im Fenster: dezenter Hinweis zum App-Update. Waehrend des Downloads ein
// schmaler Fortschrittsstreifen, danach "Version X bereit" + Neustart-Button.
export function UpdateBanner(): JSX.Element | null {
  const { t } = useTranslation()
  const { app, installApp } = useUpdater()
  const [showNotes, setShowNotes] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!app) return null

  if (app.status === 'downloading') {
    return (
      <div className="border-b border-border bg-muted/40 px-6 py-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Download className="h-3.5 w-3.5 animate-pulse" />
          <span>{t('update.downloading', { version: app.newVersion || '' })}</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-primary transition-all" style={{ width: `${app.progress ?? 0}%` }} />
          </div>
          <span>{app.progress ?? 0}%</span>
        </div>
      </div>
    )
  }

  if (app.status !== 'downloaded' || dismissed) return null

  return (
    <div className="border-b border-border bg-primary/10 px-6 py-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Download className="h-4 w-4" />
            {t('update.ready', { version: app.newVersion || '' })}
          </div>
          {app.notes && (
            <button
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowNotes((v) => !v)}
            >
              {showNotes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {t('update.whatsNew')}
            </button>
          )}
          {showNotes && app.notes && (
            <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              {app.notes}
            </pre>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" onClick={installApp}>
            <RefreshCw className="h-4 w-4" /> {t('update.restartInstall')}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDismissed(true)} title={t('common.close')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
