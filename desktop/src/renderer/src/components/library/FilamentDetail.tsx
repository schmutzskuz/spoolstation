import { useState } from 'react'
import { Plus, Copy, Trash2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Input,
  Label,
  Select,
  Switch
} from '@/components/ui'
import { InlineField } from './InlineField'
import { renderExtraField } from './ExtraFields'
import { Section } from './Section'
import { SpoolGraphic, SpoolGraphicFor } from './SpoolGraphic'
import { useLibrary } from './context'
import { useToast } from '@/context/ToastContext'
import { formatDate, decodeExtra, encodeExtraValue } from '@/lib/spool'
import { useNarrow } from '@/lib/useNarrow'
import type { SpoolmanFilament } from '../../../../shared/types'

// Mapping Extra-Schluessel -> Abschnitt. Unbekannte landen in "Weitere Felder".
const EXTRA_SECTION: Record<string, 'druck' | 'einkauf' | 'allgemein' | 'eigenschaften' | 'notizen'> = {
  max_volumetric_speed: 'druck',
  orca_preset: 'druck'
}

export function FilamentDetail({ filament }: { filament: SpoolmanFilament }): JSX.Element {
  const { t } = useTranslation()
  const { url, spools, vendors, filamentFields, reload, select } = useLibrary()
  const { toast } = useToast()
  const f = filament
  const [showArchived, setShowArchived] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const mySpools = spools.filter((s) => s.filament?.id === f.id)
  const visibleSpools = mySpools.filter((s) => showArchived || !s.archived)
  const multi = !!(f.multi_color_hexes && f.multi_color_hexes.length > 0)

  async function patch(body: Record<string, unknown>): Promise<string | null> {
    const res = await window.api.spoolman.patchFilament(url, f.id, body)
    if (res.ok) {
      await reload()
      return null
    }
    return res.error || t('lib.saveFailed')
  }

  const saveField =
    (field: keyof SpoolmanFilament, kind: 'str' | 'num', label: string, unit?: string) =>
    async (v: string): Promise<string | null> => {
      const old = f[field]
      const value = kind === 'num' ? (v.trim() === '' ? null : Number(v)) : v
      const r = await patch({ [field]: value })
      if (r === null) {
        toast(t('lib.savedField', { label, value: (v || '–') + (unit ? ' ' + unit : '') }), async () => {
          await patch({ [field]: old ?? null })
        })
      }
      return r
    }

  const saveExtra = async (key: string, encoded: string): Promise<string | null> => {
    const old = f.extra?.[key]
    const r = await patch({ extra: { ...(f.extra || {}), [key]: encoded } })
    if (r === null) {
      const label = filamentFields.find((x) => x.key === key)?.name || key
      toast(t('lib.savedFieldName', { label }), async () => {
        await patch({ extra: { ...(f.extra || {}), [key]: old ?? '""' } })
      })
    }
    return r
  }

  async function duplicate(): Promise<void> {
    setErr(null)
    const res = await window.api.spoolman.createFilament(url, {
      name: (f.name || 'Filament') + t('lib.copySuffix'),
      vendor_id: f.vendor?.id,
      material: f.material,
      density: f.density,
      diameter: f.diameter,
      weight: f.weight,
      spool_weight: f.spool_weight,
      color_hex: f.color_hex,
      multi_color_hexes: f.multi_color_hexes,
      multi_color_direction: f.multi_color_direction,
      settings_extruder_temp: f.settings_extruder_temp,
      settings_bed_temp: f.settings_bed_temp,
      price: f.price,
      article_number: f.article_number,
      comment: f.comment,
      extra: f.extra
    })
    if (res.ok && res.data) {
      await reload()
      select({ kind: 'filament', id: res.data.id })
    } else setErr(res.error || t('lib.duplicateFailed'))
  }

  async function doDelete(): Promise<void> {
    const res = await window.api.spoolman.deleteFilament(url, f.id)
    if (res.ok) {
      setDelOpen(false)
      select(null)
      await reload()
    } else setErr(res.error || t('lib.deleteFailed'))
  }

  // Extra-Felder nach Abschnitt verteilen
  const extraBuckets: Record<string, JSX.Element[]> = { druck: [], einkauf: [], allgemein: [], eigenschaften: [], notizen: [], weitere: [] }
  for (const field of filamentFields) {
    if (field.key === 'variant') continue
    const target = EXTRA_SECTION[field.key] || 'weitere'
    extraBuckets[target].push(renderExtraField(field, f.extra, saveExtra))
  }

  const [ref, narrow] = useNarrow(560)
  const headerActions = (
    <>
      <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> {t('lib.spool')}</Button>
      <Button size="sm" variant="outline" onClick={duplicate}><Copy className="h-4 w-4" /> {t('lib.duplicate')}</Button>
      <Button size="sm" variant="outline" onClick={() => setDelOpen(true)} disabled={mySpools.length > 0}><Trash2 className="h-4 w-4" /></Button>
    </>
  )

  return (
    <div ref={ref}>
      {/* Sticky-Kopf */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
        <div className="flex items-start gap-4">
          <SpoolGraphic size={narrow ? 64 : 96} colors={f.multi_color_hexes && f.multi_color_hexes.length > 0 ? f.multi_color_hexes.split(',').map((x) => x.trim()) : f.color_hex ? [f.color_hex] : undefined} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold">{f.name || f.material || t('lib.filament')}</div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {f.vendor?.name && <span>{f.vendor.name}</span>}
              {f.material && <Badge variant="muted">{f.material}</Badge>}
              {f.diameter && <span>{f.diameter} mm</span>}
              <span className="text-xs">· {t('lib.registeredAt', { date: formatDate(f.registered) })}</span>
            </div>
          </div>
          {!narrow && <div className="flex shrink-0 gap-2">{headerActions}</div>}
        </div>
        {narrow && <div className="mt-3 flex flex-wrap gap-2">{headerActions}</div>}
      </div>

      <div className="space-y-6 px-6 py-5">
        {err && <Alert variant="danger">{err}</Alert>}

        {/* Spulen dieses Filaments */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{t('lib.spoolsOf', { count: mySpools.length })}</h3>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={showArchived} onCheckedChange={setShowArchived} /> {t('lib.archivedSwitch')}
            </label>
          </div>
          {visibleSpools.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('lib.noSpoolsHint')}</p>
          ) : (
            <div className="space-y-1">
              {visibleSpools.map((s) => (
                <button key={s.id} onClick={() => select({ kind: 'spool', id: s.id })} className="flex w-full items-center gap-3 border-b border-border px-1 py-1.5 text-left text-sm hover:bg-accent">
                  <SpoolGraphicFor spool={s} size={40} />
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">#{s.id}</span>
                  <span className="flex-1 text-xs text-muted-foreground">{t('lib.restG', { weight: Math.round(s.remaining_weight || 0) + ' g' })}</span>
                  {s.archived && <Badge variant="muted">{t('lib.archivedBadge')}</Badge>}
                </button>
              ))}
            </div>
          )}
        </section>

        <Section title={t('lib.sGeneral')} cols={3} narrow={narrow}>
          <InlineField kind="text" label={t('lib.fName')} value={f.name || ''} onSave={saveField('name', 'str', t('lib.fName'))} />
          <InlineField kind="text" label={t('lib.fMaterial')} value={f.material || ''} onSave={saveField('material', 'str', t('lib.fMaterial'))} />
          <InlineField kind="text" label={t('lib.fSubtype')} value={decodeExtra(f.extra?.variant)} onSave={(v) => saveExtra('variant', encodeExtraValue(v))} />
          <div className="space-y-1">
            <Label className="text-xs">{t('lib.fMulticolor')}</Label>
            <div className="h-9 pt-0.5">
              <Switch checked={multi} onCheckedChange={async (on) => { if (on) await patch({ multi_color_hexes: f.color_hex || '', multi_color_direction: 'coaxial' }); else await patch({ multi_color_hexes: '', multi_color_direction: null }) }} />
            </div>
          </div>
          {multi ? (
            <>
              <InlineField kind="text" label={t('lib.fColors')} value={f.multi_color_hexes || ''} onSave={saveField('multi_color_hexes', 'str', t('lib.fColorsShort'))} />
              <InlineField kind="select" label={t('lib.fDirection')} value={f.multi_color_direction || 'coaxial'} options={[{ value: 'coaxial', label: t('lib.coaxial') }, { value: 'longitudinal', label: t('lib.longitudinal') }]} onSave={saveField('multi_color_direction', 'str', t('lib.fDirection'))} />
            </>
          ) : (
            <InlineField kind="color" label={t('lib.fColor')} value={(f.color_hex || '').replace('#', '')} placeholder="1E90FF" onSave={saveField('color_hex', 'str', t('lib.fColor'))} />
          )}
          {extraBuckets.allgemein}
        </Section>

        <Section title={t('lib.sProperties')} cols={2} narrow={narrow}>
          <InlineField kind="number" min={0} label={t('lib.fDiameter')} unit="mm" value={f.diameter != null ? String(f.diameter) : ''} onSave={saveField('diameter', 'num', t('lib.fDiameter'), 'mm')} />
          <InlineField kind="number" min={0} label={t('lib.fDensity')} unit="g/cm³" value={f.density != null ? String(f.density) : ''} onSave={saveField('density', 'num', t('lib.fDensity'))} />
          <InlineField kind="number" min={0} label={t('lib.fNetWeight')} unit="g" value={f.weight != null ? String(f.weight) : ''} onSave={saveField('weight', 'num', t('lib.fNetWeight'), 'g')} />
          <InlineField kind="number" min={0} label={t('lib.fEmptySpool')} unit="g" value={f.spool_weight != null ? String(f.spool_weight) : ''} onSave={saveField('spool_weight', 'num', t('lib.fEmptyWeight'), 'g')} />
          {extraBuckets.eigenschaften}
        </Section>

        <Section title={t('lib.sPrintSettings')} cols={2} narrow={narrow}>
          <InlineField kind="number" min={0} label={t('lib.fNozzleTemp')} unit="°C" value={f.settings_extruder_temp != null ? String(f.settings_extruder_temp) : ''} onSave={saveField('settings_extruder_temp', 'num', t('lib.fNozzleTemp'), '°C')} />
          <InlineField kind="number" min={0} label={t('lib.fBedTemp')} unit="°C" value={f.settings_bed_temp != null ? String(f.settings_bed_temp) : ''} onSave={saveField('settings_bed_temp', 'num', t('lib.fBedTemp'), '°C')} />
          {extraBuckets.druck}
        </Section>

        <Section title={t('lib.sPurchase')} cols={2} narrow={narrow}>
          <InlineField kind="number" min={0} label={t('lib.fPrice')} value={f.price != null ? String(f.price) : ''} onSave={saveField('price', 'num', t('lib.fPrice'))} />
          <InlineField kind="text" label={t('lib.fArticle')} value={f.article_number || ''} onSave={saveField('article_number', 'str', t('lib.fArticle'))} />
          {extraBuckets.einkauf}
        </Section>

        <Section title={t('lib.sNotes')} cols={1} narrow={narrow}>
          <InlineField kind="textarea" label={t('lib.fComment')} value={f.comment || ''} onSave={saveField('comment', 'str', t('lib.fComment'))} />
          {extraBuckets.notizen}
        </Section>

        {extraBuckets.weitere.length > 0 && <Section title={t('lib.sMoreFields')} cols={2} narrow={narrow}>{extraBuckets.weitere}</Section>}

        {/* Hersteller */}
        <Section title={t('lib.sVendor')} cols={2} narrow={narrow}>
          <div className="space-y-1">
            <Label className="text-xs">{t('lib.vendor')}</Label>
            <Select value={f.vendor ? String(f.vendor.id) : ''} className="h-9" onChange={(e) => patch({ vendor_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">{t('lib.noneDash')}</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </div>
          <div className="flex items-end">
            {f.vendor && (
              <Button size="sm" variant="ghost" onClick={() => select({ kind: 'vendor', id: f.vendor!.id })}>
                {t('lib.openVendor')} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </Section>
      </div>

      {addOpen && <AddSpoolDialog filament={f} onClose={() => setAddOpen(false)} onCreated={(id) => { setAddOpen(false); reload().then(() => select({ kind: 'spool', id })) }} />}

      <Dialog open={delOpen} onClose={() => setDelOpen(false)} title={t('lib.deleteFilamentTitle')}
        footer={<><Button variant="outline" onClick={() => setDelOpen(false)}>{t('common.cancel')}</Button><Button variant="destructive" onClick={doDelete}>{t('lib.deleteForever')}</Button></>}>
        <p className="text-sm">{t('lib.deleteFilamentBody', { name: [f.vendor?.name, f.name].filter(Boolean).join(' ') })}</p>
      </Dialog>
    </div>
  )
}

function AddSpoolDialog({ filament, onClose, onCreated }: { filament: SpoolmanFilament; onClose: () => void; onCreated: (id: number) => void }): JSX.Element {
  const { t } = useTranslation()
  const { url } = useLibrary()
  const [initial, setInitial] = useState(String(filament.weight || 1000))
  const [spoolW, setSpoolW] = useState(String(filament.spool_weight || 200))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function create(): Promise<void> {
    setBusy(true)
    setErr(null)
    const res = await window.api.spoolman.createSpool(url, { filament_id: filament.id, initial_weight: Number(initial) || undefined, spool_weight: Number(spoolW) || undefined })
    if (res.ok && res.data) onCreated(res.data.id)
    else { setErr(res.error || t('lib.createFailed')); setBusy(false) }
  }
  return (
    <Dialog open onClose={onClose} title={t('lib.addSpool')} description={[filament.vendor?.name, filament.name].filter(Boolean).join(' · ')}
      footer={<><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button onClick={create} loading={busy}>{t('lib.create')}</Button></>}>
      {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>{t('lib.netWeightG')}</Label><Input type="number" value={initial} onChange={(e) => setInitial(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>{t('lib.emptySpoolG')}</Label><Input type="number" value={spoolW} onChange={(e) => setSpoolW(e.target.value)} /></div>
      </div>
    </Dialog>
  )
}
