import { useEffect, useState } from 'react'
import { Minus, Scale, Archive, ArchiveRestore, Copy, Trash2, Tag, Unlink, Send, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { Alert, Badge, Button, Dialog, Input, Label, Select, Spinner } from '@/components/ui'
import { InlineField } from './InlineField'
import { renderExtraField } from './ExtraFields'
import { Section } from './Section'
import { SpoolGraphicFor } from './SpoolGraphic'
import { useLibrary } from './context'
import { useToast } from '@/context/ToastContext'
import { cardUidsOf, formatDate, formatWeight, relativeTime, spoolLabel, spoolToOpenSpool } from '@/lib/spool'
import { writeTagForSpool, type TagWriteResult } from '@/lib/actions'
import { useNarrow } from '@/lib/useNarrow'
import { useJob } from '@/lib/useJob'
import { resetJob, startJob } from '@/lib/jobStore'
import { Check } from 'lucide-react'
import type { SpoolmanSpool } from '../../../../shared/types'

export function SpoolDetail({ spool }: { spool: SpoolmanSpool }): JSX.Element {
  const { t } = useTranslation()
  const { url, spools, spoolFields, reload, select } = useLibrary()
  const { target, status, connected, printerTarget, settings, saveSettings } = useConnection()
  const { toast } = useToast()
  const canTag = connected && !!status?.nfc_ok
  const s = spool
  const uids = cardUidsOf(s)

  const [err, setErr] = useState<string | null>(null)
  const [useOpen, setUseOpen] = useState(false)
  const [measureOpen, setMeasureOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [writeOpen, setWriteOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function patch(body: Record<string, unknown>): Promise<string | null> {
    const res = await window.api.spoolman.patchSpool(url, s.id, body)
    if (res.ok) {
      await reload()
      return null
    }
    return res.error || t('lib.saveFailed')
  }
  const saveField =
    (field: keyof SpoolmanSpool, kind: 'str' | 'num', label: string, unit?: string) =>
    async (v: string): Promise<string | null> => {
      const old = s[field]
      const value = kind === 'num' ? (v.trim() === '' ? null : Number(v)) : v
      const r = await patch({ [field]: value })
      if (r === null) toast(t('lib.savedField', { label, value: (v || '–') + (unit ? ' ' + unit : '') }), async () => { await patch({ [field]: old ?? null }) })
      return r
    }
  const saveExtra = async (key: string, encoded: string): Promise<string | null> => {
    const old = s.extra?.[key]
    const r = await patch({ extra: { ...(s.extra || {}), [key]: encoded } })
    if (r === null) {
      const label = spoolFields.find((x) => x.key === key)?.name || key
      toast(t('lib.savedFieldName', { label }), async () => { await patch({ extra: { ...(s.extra || {}), [key]: old ?? '""' } }) })
    }
    return r
  }

  async function toggleArchive(): Promise<void> {
    setErr(await patch({ archived: !s.archived }))
  }
  async function duplicate(): Promise<void> {
    setErr(null)
    const extra = { ...(s.extra || {}) }
    delete extra.card_uids
    const res = await window.api.spoolman.createSpool(url, { filament_id: s.filament.id, initial_weight: s.initial_weight, spool_weight: s.spool_weight, price: s.price, location: s.location, lot_nr: s.lot_nr, comment: s.comment, extra })
    if (res.ok && res.data) { await reload(); select({ kind: 'spool', id: res.data.id }) }
    else setErr(res.error || t('lib.duplicateFailed'))
  }
  async function unlinkTag(): Promise<void> {
    setBusy(true)
    setErr(await patch({ extra: { ...(s.extra || {}), card_uids: '""' } }))
    setBusy(false)
  }

  const extraEls = spoolFields.filter((x) => x.key !== 'card_uids').map((fld) => renderExtraField(fld, s.extra, saveExtra))
  const [ref, narrow] = useNarrow(560)

  // Aktionsbuttons im Kopf – bei engem Panel unter den Titel umgebrochen.
  const headerActions = (
    <>
      <Button size="sm" variant="outline" onClick={() => setUseOpen(true)}><Minus className="h-4 w-4" /> {t('lib.use')}</Button>
      <Button size="sm" variant="outline" onClick={() => setMeasureOpen(true)}><Scale className="h-4 w-4" /> {t('lib.measured')}</Button>
      <Button size="sm" variant="outline" onClick={toggleArchive}>{s.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</Button>
      <Button size="sm" variant="outline" onClick={duplicate}><Copy className="h-4 w-4" /></Button>
      <Button size="sm" variant="destructive" onClick={() => setDelOpen(true)}><Trash2 className="h-4 w-4" /></Button>
    </>
  )

  return (
    <div ref={ref}>
      {/* Sticky-Kopf */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
        <div className="flex items-start gap-4">
          <SpoolGraphicFor spool={s} size={narrow ? 64 : 96} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-lg font-semibold">
              {t('lib.spoolHead', { id: s.id })}
              {s.archived && <Badge variant="muted">{t('lib.archivedBadge')}</Badge>}
            </div>
            <button className="truncate text-sm text-primary hover:underline" onClick={() => select({ kind: 'filament', id: s.filament.id })}>
              {spoolLabel(s)} <ArrowRight className="inline h-3 w-3" />
            </button>
          </div>
          {!narrow && <div className="flex shrink-0 flex-wrap justify-end gap-2">{headerActions}</div>}
        </div>
        {narrow && <div className="mt-3 flex flex-wrap gap-2">{headerActions}</div>}
      </div>

      <div className="space-y-6 px-6 py-5">
        {err && <Alert variant="danger">{err}</Alert>}

        <section className="space-y-3">
          <div className={`grid gap-x-4 gap-y-2 text-sm ${narrow ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <Stat label={t('lib.statRemaining')} value={formatWeight(s.remaining_weight)} />
            <Stat label={t('lib.statUsed')} value={formatWeight(s.used_weight)} />
            <Stat label={t('lib.statInitial')} value={formatWeight(s.initial_weight)} />
            <Stat label={t('lib.statEmpty')} value={formatWeight(s.spool_weight)} />
          </div>
        </section>

        <Section title={t('lib.sWeights')} cols={2} narrow={narrow}>
          <InlineField kind="number" min={0} label={t('lib.fInitialWeight')} unit="g" value={s.initial_weight != null ? String(s.initial_weight) : ''} onSave={saveField('initial_weight', 'num', t('lib.fInitialWeight'), 'g')} />
          <InlineField kind="number" min={0} label={t('lib.fEmptySpool')} unit="g" value={s.spool_weight != null ? String(s.spool_weight) : ''} onSave={saveField('spool_weight', 'num', t('lib.fEmptyWeight'), 'g')} />
        </Section>

        <Section title={t('lib.sStorage')} cols={2} narrow={narrow}>
          <InlineField kind="text" label={t('lib.fLocation')} value={s.location || ''} onSave={saveField('location', 'str', t('lib.fLocation'))} />
          <InlineField kind="text" label={t('lib.fLotNr')} value={s.lot_nr || ''} onSave={saveField('lot_nr', 'str', t('lib.fLotNr'))} />
          <InlineField kind="number" min={0} label={t('lib.fPrice')} value={s.price != null ? String(s.price) : ''} onSave={saveField('price', 'num', t('lib.fPrice'))} />
        </Section>

        <Section title={t('lib.sUsage')} cols={3} narrow={narrow}>
          <InlineField kind="text" label={t('lib.firstUsed')} value={formatDate(s.first_used)} readOnly />
          <InlineField kind="text" label={t('lib.lastUsed')} value={s.last_used ? `${formatDate(s.last_used)} (${relativeTime(s.last_used)})` : relativeTime(s.last_used)} readOnly />
          <InlineField kind="text" label={t('lib.registered')} value={formatDate(s.registered)} readOnly />
        </Section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t('lib.sTagsPrinter')}</h3>
          <div className="flex flex-wrap items-center gap-2">
            {uids.length ? uids.map((u) => <Badge key={u} variant="success"><Tag className="h-3.5 w-3.5" /> {u}</Badge>) : <span className="text-sm text-muted-foreground">{t('lib.noTagsLinked')}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setWriteOpen(true)} disabled={!canTag}><Tag className="h-4 w-4" /> {t('lib.writeTag')}</Button>
            <Button size="sm" variant="outline" onClick={unlinkTag} disabled={uids.length === 0} loading={busy}><Unlink className="h-4 w-4" /> {t('lib.unlink')}</Button>
            <Button size="sm" variant="outline" onClick={() => setSendOpen(true)} disabled={!printerTarget}><Send className="h-4 w-4" /> {t('lib.toSlot')}</Button>
          </div>
        </section>

        <Section title={t('lib.sNotes')} cols={1} narrow={narrow}>
          <InlineField kind="textarea" label={t('lib.fComment')} value={s.comment || ''} onSave={saveField('comment', 'str', t('lib.fComment'))} />
        </Section>

        {extraEls.length > 0 && <Section title={t('lib.sMoreFields')} cols={2} narrow={narrow}>{extraEls}</Section>}
      </div>

      {useOpen && <UseDialog spool={s} onClose={() => setUseOpen(false)} onDone={() => { setUseOpen(false); reload() }} />}
      {measureOpen && <MeasureDialog spool={s} onClose={() => setMeasureOpen(false)} onDone={() => { setMeasureOpen(false); reload() }} />}
      {sendOpen && (
        <SendToSlotDialog spool={s} onClose={() => setSendOpen(false)} onDone={async (channel, host) => {
          const map = { ...(settings.slotSpools || {}) }
          map[host] = { ...(map[host] || {}), [String(channel)]: s.id }
          await saveSettings({ slotSpools: map })
          setSendOpen(false)
        }} />
      )}
      {writeOpen && <WriteTagDialog jobKey={`write:${s.id}`} run={() => writeTagForSpool(target, url, s)} onReload={reload} onClose={() => setWriteOpen(false)} />}
      {delOpen && <DeleteSpoolDialog spool={s} siblingCount={spools.filter((x) => x.filament?.id === s.filament.id).length} onClose={() => setDelOpen(false)} onDone={() => { setDelOpen(false); select(null); reload() }} />}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>
}

function UseDialog({ spool, onClose, onDone }: { spool: SpoolmanSpool; onClose: () => void; onDone: () => void }): JSX.Element {
  const { t } = useTranslation()
  const { url } = useLibrary()
  const [g, setG] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function go(): Promise<void> {
    const w = Number(g.replace(',', '.'))
    if (!w || w <= 0) { setErr(t('lib.enterGrams')); return }
    setBusy(true)
    const r = await window.api.spoolman.useSpool(url, spool.id, w)
    if (r.ok) onDone()
    else { setErr(r.error || t('lib.failed')); setBusy(false) }
  }
  return (
    <Dialog open onClose={onClose} title={t('lib.useTitle')} description={t('lib.spoolHead', { id: spool.id })}
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button onClick={go} loading={busy}>{t('lib.subtract')}</Button></>}>
      {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
      <div className="space-y-1.5"><Label>{t('lib.usedFilamentG')}</Label><Input type="number" value={g} onChange={(e) => setG(e.target.value)} autoFocus /></div>
    </Dialog>
  )
}

function MeasureDialog({ spool, onClose, onDone }: { spool: SpoolmanSpool; onClose: () => void; onDone: () => void }): JSX.Element {
  const { t } = useTranslation()
  const { url } = useLibrary()
  const [g, setG] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function go(): Promise<void> {
    const w = Number(g.replace(',', '.'))
    if (!w || w <= 0) { setErr(t('lib.enterGross')); return }
    setBusy(true)
    const r = await window.api.spoolman.measureSpool(url, spool.id, w)
    if (r.ok) onDone()
    else { setErr(r.error || t('lib.failed')); setBusy(false) }
  }
  return (
    <Dialog open onClose={onClose} title={t('lib.measureTitle')} description={t('lib.measureDesc')}
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button onClick={go} loading={busy}>{t('lib.apply')}</Button></>}>
      {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
      <div className="space-y-1.5"><Label>{t('lib.grossWeightG')}</Label><Input type="number" value={g} onChange={(e) => setG(e.target.value)} autoFocus /><p className="text-xs text-muted-foreground">{t('lib.measureHint')}</p></div>
    </Dialog>
  )
}

function SendToSlotDialog({ spool, onClose, onDone }: { spool: SpoolmanSpool; onClose: () => void; onDone: (channel: number, host: string) => void }): JSX.Element {
  const { t } = useTranslation()
  const { printers, activePrinter } = useConnection()
  const [printerIdx, setPrinterIdx] = useState(activePrinter)
  const [channel, setChannel] = useState('0')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const printer = printers[printerIdx]

  async function go(): Promise<void> {
    if (!printer) return
    setBusy(true)
    setErr(null)
    const ch = Number(channel)
    const r = await window.api.printer.assign({ host: printer.host, port: printer.port }, ch, spoolToOpenSpool(spool))
    if (r.ok) onDone(ch, printer.host)
    else { setErr(r.error || t('lib.sendFailed')); setBusy(false) }
  }
  return (
    <Dialog open onClose={onClose} title={t('lib.sendToSlotTitle')} description={spoolLabel(spool)}
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button onClick={go} loading={busy} disabled={!printer}>{t('lib.send')}</Button></>}>
      {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
      {printers.length > 1 && (
        <div className="mb-3 space-y-1.5">
          <Label>{t('lib.printer')}</Label>
          <Select value={String(printerIdx)} onChange={(e) => setPrinterIdx(Number(e.target.value))}>
            {printers.map((p, i) => <option key={i} value={i}>{p.name || p.host}</option>)}
          </Select>
        </div>
      )}
      <div className="space-y-1.5"><Label>{t('lib.slot')}</Label>
        <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="0">T1</option><option value="1">T2</option><option value="2">T3</option><option value="3">T4</option>
        </Select>
      </div>
    </Dialog>
  )
}

// Tag schreiben: Starten laeuft genau einmal ueber den Job-Store, die Verfolgung
// bei jedem Mount neu – StrictMode-Remounts sind dadurch egal.
function WriteTagDialog({ jobKey, run, onClose, onReload }: { jobKey: string; run: () => Promise<TagWriteResult>; onClose: () => void; onReload: () => void }): JSX.Element {
  const { t } = useTranslation()
  const { running, result } = useJob<TagWriteResult>(jobKey, run)

  // Erfolg: Spulendaten neu laden (Tag-Liste) und nach 2 s automatisch schliessen.
  useEffect(() => {
    if (result?.ok) {
      onReload()
      const id = setTimeout(() => { resetJob(jobKey); onClose() }, 2000)
      return () => clearTimeout(id)
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.ok])

  function close(): void { resetJob(jobKey); onClose() }
  function retry(): void { resetJob(jobKey); startJob(jobKey, run) }

  const footer = result && !result.ok
    ? (<><Button variant="outline" onClick={close}>{t('common.close')}</Button><Button onClick={retry}>{t('lib.retry')}</Button></>)
    : (<Button variant={result?.ok ? 'default' : 'outline'} onClick={close}>{result?.ok ? t('common.done') : t('common.close')}</Button>)

  return (
    <Dialog open onClose={close} title={t('lib.writeTag')} footer={footer}>
      {running && <div className="flex items-center gap-3 py-4 text-sm"><Spinner /> {t('lib.placeTagHint')}</div>}
      {running && <p className="text-xs text-muted-foreground">{t('lib.overwriteHint')}</p>}
      {result?.ok && (
        <Alert variant="default">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <span>{result.msg}{result.uid ? ` · ${result.uid}` : ''}</span>
          </span>
        </Alert>
      )}
      {result && !result.ok && <Alert variant="danger">{result.msg}</Alert>}
    </Dialog>
  )
}

export function DeleteSpoolDialog({ spool, siblingCount, onClose, onDone }: { spool: SpoolmanSpool; siblingCount: number; onClose: () => void; onDone: () => void }): JSX.Element {
  const { t } = useTranslation()
  const { url } = useLibrary()
  const { printerTarget } = useConnection()
  const [assignedCh, setAssignedCh] = useState<number | null>(null)
  const [clearSlot, setClearSlot] = useState(true)
  const [phase, setPhase] = useState<'confirm' | 'filament'>('confirm')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!printerTarget) return
    window.api.printer.query(printerTarget).then((r) => {
      if (r.ok && r.data) { const slot = r.data.find((sl) => sl.spoolId === spool.id); if (slot) setAssignedCh(slot.channel) }
    })
  }, [printerTarget, spool.id])

  async function archive(): Promise<void> {
    setBusy(true); setErr(null)
    const r = await window.api.spoolman.patchSpool(url, spool.id, { archived: true })
    if (r.ok) onDone(); else { setErr(r.error || t('lib.archiveFailed')); setBusy(false) }
  }
  async function del(): Promise<void> {
    setBusy(true); setErr(null)
    if (assignedCh !== null && clearSlot && printerTarget) await window.api.printer.clearSlot(printerTarget, assignedCh)
    const r = await window.api.spoolman.deleteSpool(url, spool.id)
    if (!r.ok) { setErr(r.error || t('lib.deleteFailed')); setBusy(false); return }
    if (siblingCount <= 1) { setPhase('filament'); setBusy(false) } else onDone()
  }
  async function delFilament(): Promise<void> {
    setBusy(true)
    const r = await window.api.spoolman.deleteFilament(url, spool.filament.id)
    if (!r.ok) setErr(r.error || t('lib.deleteFilamentFailed'))
    onDone()
  }

  if (phase === 'filament') {
    return (
      <Dialog open onClose={onDone} title={t('lib.deleteFilamentAlsoTitle')} footer={<><Button variant="outline" onClick={onDone} disabled={busy}>{t('lib.keep')}</Button><Button variant="destructive" onClick={delFilament} loading={busy}>{t('lib.deleteFilamentBtn')}</Button></>}>
        {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
        <p className="text-sm">{t('lib.lastSpoolBody', { name: spoolLabel(spool) })}</p>
      </Dialog>
    )
  }
  return (
    <Dialog open onClose={onClose} title={t('lib.deleteSpoolTitle')} footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button variant="outline" onClick={archive} loading={busy}>{t('lib.archiveInstead')}</Button><Button variant="destructive" onClick={del} loading={busy}>{t('common.delete')}</Button></>}>
      {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
      <p className="text-sm">{t('lib.deleteSpoolBody', { id: spool.id, label: spoolLabel(spool), weight: formatWeight(spool.remaining_weight) })}</p>
      {assignedCh !== null && (
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <div className="mb-1 font-medium text-amber-600 dark:text-amber-400">{t('lib.assignedToSlot', { slot: assignedCh + 1 })}</div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={clearSlot} onChange={(e) => setClearSlot(e.target.checked)} /> {t('lib.clearSlotFirst')}</label>
        </div>
      )}
    </Dialog>
  )
}
