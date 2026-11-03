import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { HelpButton } from '@/components/HelpButton'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  Input,
  Spinner
} from '@/components/ui'
import { SpoolGraphic, SpoolGraphicFor } from '@/components/library/SpoolGraphic'
import { cardUidsOf, colorStyle, formatWeight, spoolLabel, spoolToOpenSpool } from '@/lib/spool'
import type { PrinterDef, PrinterState, SlotInfo, SpoolmanSpool } from '../../../shared/types'

// onEditPrinter springt in die Einstellungen (wird von der App-Shell gereicht).
export function DruckerPage({ onEditPrinter }: { onEditPrinter?: () => void } = {}): JSX.Element {
  const { t } = useTranslation()
  const { settings, saveSettings, printerTarget, printers, printerStatus, printerConnected, activePrinter, setActivePrinter } = useConnection()
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [spools, setSpools] = useState<SpoolmanSpool[]>([])
  const [pstate, setPstate] = useState<PrinterState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignCh, setAssignCh] = useState<number | null>(null)
  const [busyCh, setBusyCh] = useState<number | null>(null)

  const ptRef = useRef(printerTarget)
  ptRef.current = printerTarget
  const urlRef = useRef(settings.spoolmanUrl)
  urlRef.current = settings.spoolmanUrl

  const load = useCallback(async () => {
    const pt = ptRef.current
    if (!pt) {
      setSlots([])
      setPstate(null)
      setError(null)
      return
    }
    setLoading(true)
    const [res, stateRes] = await Promise.all([window.api.printer.query(pt), window.api.printer.state(pt)])
    if (res.ok && res.data) {
      setSlots(res.data)
      setError(null)
    } else {
      setError(res.error || t('printer.notReachable'))
    }
    setPstate(stateRes.ok && stateRes.data ? stateRes.data : { reachable: false, state: 'unknown' })
    if (urlRef.current) {
      const sp = await window.api.spoolman.listSpools(urlRef.current)
      if (sp.ok && sp.data) setSpools(sp.data)
    }
    setLoading(false)
  }, [t])

  useEffect(() => {
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [load, printerTarget])

  function resolveSpool(slot: SlotInfo): SpoolmanSpool | undefined {
    // 1. Direkt vom Drucker gemeldete spool_id (AFC_lane.get_status)
    if (slot.spoolId) {
      const direct = spools.find((s) => s.id === slot.spoolId)
      if (direct) return direct
    }
    // 2. Ueber den Tag (CARD_UID -> card_uids)
    if (slot.cardUid) {
      const byUid = spools.find((s) => cardUidsOf(s).includes(slot.cardUid as string))
      if (byUid) return byUid
    }
    // 3. Fallback: lokal gemerkte, tag-lose Zuweisung
    const key = printerTarget?.host || ''
    const localId = settings.slotSpools[key]?.[String(slot.channel)]
    if (localId) return spools.find((s) => s.id === localId)
    return undefined
  }

  async function assign(channel: number, spool: SpoolmanSpool): Promise<void> {
    if (!printerTarget) return
    setAssignCh(null)
    setBusyCh(channel)
    setError(null)
    const os = spoolToOpenSpool(spool)
    const res = await window.api.printer.assign(printerTarget, channel, os)
    if (res.ok) {
      const key = printerTarget.host
      const map = { ...(settings.slotSpools || {}) }
      map[key] = { ...(map[key] || {}), [String(channel)]: spool.id }
      await saveSettings({ slotSpools: map })
      await load()
    } else {
      setError(res.error || t('printer.assignFailed'))
    }
    setBusyCh(null)
  }

  async function clearSlot(channel: number): Promise<void> {
    if (!printerTarget) return
    setBusyCh(channel)
    setError(null)
    const res = await window.api.printer.clearSlot(printerTarget, channel)
    if (res.ok) {
      const key = printerTarget.host
      const map = { ...(settings.slotSpools || {}) }
      if (map[key]) {
        const inner = { ...map[key] }
        delete inner[String(channel)]
        map[key] = inner
      }
      await saveSettings({ slotSpools: map })
      await load()
    } else {
      setError(res.error || t('printer.clearFailed'))
    }
    setBusyCh(null)
  }

  const activeDef = printers[activePrinter]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{t('printer.title')}</h1>
        <HelpButton chapter="printers" />
      </div>

      {printers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-14 text-center">
          <Printer className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">{t('printer.noPrinter')}</p>
          <Button onClick={onEditPrinter}>
            <Plus className="h-4 w-4" /> {t('settings.addPrinter')}
          </Button>
        </div>
      ) : (
        <>
          {printers.length > 1 && (
            <div className="flex flex-wrap gap-2 border-b border-border">
              {printers.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePrinter(i)}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm ${i === activePrinter ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  <span className={`h-2 w-2 rounded-full ${printerStatus[i] ? 'bg-success' : 'bg-destructive'}`} />
                  {p.name || p.host}
                </button>
              ))}
            </div>
          )}

          {activeDef && (
            <PrinterHeader
              printer={activeDef}
              connected={printerConnected}
              state={pstate}
              onEdit={onEditPrinter}
            />
          )}

          {error && <Alert variant="danger">{error}</Alert>}

          <div className="flex flex-wrap justify-center gap-4">
            {slots.map((slot) => {
              const ch = slot.channel
              const spool = resolveSpool(slot)
              return (
                <SlotCard
                  key={ch}
                  channel={ch}
                  slot={slot}
                  spool={spool}
                  spoolmanUrl={settings.spoolmanUrl}
                  busy={busyCh === ch}
                  onAssign={() => setAssignCh(ch)}
                  onClear={() => clearSlot(ch)}
                />
              )
            })}
            {slots.length === 0 && !loading && (
              <div className="py-8 text-sm text-muted-foreground">{t('printer.noSlots')}</div>
            )}
          </div>
        </>
      )}

      <AssignDialog
        open={assignCh !== null}
        channel={assignCh ?? 0}
        spools={spools}
        onClose={() => setAssignCh(null)}
        onPick={(spool) => assignCh !== null && assign(assignCh, spool)}
      />
    </div>
  )
}

// Kopf ueber den Slots: Name, Status (verbunden/getrennt), IP:Port,
// Druckerzustand (bereit/druckt/pausiert/Fehler) und "Bearbeiten".
function PrinterHeader({
  printer,
  connected,
  state,
  onEdit
}: {
  printer: PrinterDef
  connected: boolean
  state: PrinterState | null
  onEdit?: () => void
}): JSX.Element {
  const { t } = useTranslation()

  // Zustandstext + Farbe nur sinnvoll, wenn der Drucker erreichbar ist.
  let stateText = ''
  let stateClass = 'text-muted-foreground'
  let progress: number | undefined
  if (connected && state) {
    switch (state.state) {
      case 'printing': {
        const parts = [t('printer.statePrinting')]
        if (state.filename) parts.push(state.filename)
        stateText = parts.join(' · ') + (state.progress != null ? ` · ${state.progress} %` : '')
        stateClass = 'text-primary'
        progress = state.progress
        break
      }
      case 'paused':
        stateText = t('printer.statePaused')
        stateClass = 'text-amber-600 dark:text-amber-400'
        break
      case 'error':
        stateText = state.message ? `${t('printer.stateError')} · ${state.message}` : t('printer.stateError')
        stateClass = 'text-destructive'
        break
      default:
        stateText = t('printer.stateReady')
        stateClass = 'text-success'
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${connected ? 'bg-success' : 'bg-destructive'}`} />
            <span className="truncate text-base font-semibold">{printer.name || printer.host}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {connected ? t('printer.connected') : t('printer.disconnected')} · {printer.host}:{printer.port}
            </span>
          </div>
          {stateText && <div className={`mt-1 truncate text-sm ${stateClass}`}>{stateText}</div>}
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> {t('printer.edit')}
        </Button>
      </div>
      {progress != null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

function SlotCard({
  channel,
  slot,
  spool,
  spoolmanUrl,
  busy,
  onAssign,
  onClear
}: {
  channel: number
  slot?: SlotInfo
  spool?: SpoolmanSpool
  spoolmanUrl: string
  busy: boolean
  onAssign: () => void
  onClear: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const present = !!slot?.present
  const material = spool?.filament?.material || slot?.mainType
  const name = spool ? spoolLabel(spool) : slot?.name || material || (present ? t('printer.unknownFilament') : t('printer.empty'))
  const remaining = spool ? spool.remaining_weight : slot?.weight
  const unknown = present && !spool && !slot?.colorHex && !material && !slot?.name

  const temps: string[] = []
  if (slot?.hotendMin != null || slot?.hotendMax != null)
    temps.push(`${t('printer.nozzle')} ${slot?.hotendMin ?? '?'}–${slot?.hotendMax ?? '?'} °C`)
  if (slot?.bedTemp != null) temps.push(`${t('printer.bed')} ${slot.bedTemp} °C`)

  return (
    <div className="flex w-[190px] flex-col items-center gap-2 border border-border p-3">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold">T{channel + 1}</span>
        {busy && <Spinner />}
      </div>

      {!present ? (
        <SpoolGraphic empty size={110} />
      ) : spool ? (
        <SpoolGraphicFor spool={spool} size={110} />
      ) : unknown ? (
        <SpoolGraphic empty size={110} />
      ) : (
        <SpoolGraphic colors={slot?.colorHex ? [slot.colorHex] : undefined} size={110} />
      )}

      <div className="w-full text-center">
        <div className="truncate text-sm font-medium">{name || '—'}</div>
        {material && (
          <div className="mt-1">
            <Badge variant="muted" className="px-1.5 py-0">{material}</Badge>
          </div>
        )}
        {remaining != null && (
          <div className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>{t('printer.rest', { weight: formatWeight(remaining) })}</span>
            {spool && spoolmanUrl && (
              <a href={`${spoolmanUrl.replace(/\/+$/, '')}/spool/show/${spool.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
        {temps.length > 0 && <div className="mt-0.5 text-xs text-muted-foreground">{temps.join(' · ')}</div>}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button size="icon" className="h-8 w-8" title={t('printer.assign')} onClick={onAssign} disabled={busy}>
          <Plus className="h-4 w-4" />
        </Button>
        {present && (
          <Button size="icon" variant="outline" className="h-8 w-8" title={t('printer.clearSlot')} onClick={onClear} disabled={busy}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function AssignDialog({
  open,
  channel,
  spools,
  onClose,
  onPick
}: {
  open: boolean
  channel: number
  spools: SpoolmanSpool[]
  onClose: () => void
  onPick: (spool: SpoolmanSpool) => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const filtered = spools.filter((s) => !s.archived && spoolLabel(s).toLowerCase().includes(q.toLowerCase()))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('printer.assignTitle', { slot: `T${channel + 1}` })}
      description={t('printer.assignDesc')}
    >
      <div className="space-y-3">
        <Input placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('common.nothingFound')}</p>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="h-6 w-6 shrink-0 rounded-full border border-border" style={colorStyle(s.filament?.color_hex)} />
              <span className="min-w-0 flex-1 truncate">{spoolLabel(s)}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatWeight(s.remaining_weight)}</span>
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
