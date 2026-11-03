import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Input, Label, Select, Spinner, Switch } from '@/components/ui'
import { Section } from './Section'
import { COMMON_MATERIALS, colorStyle, encodeExtraValue, materialDensity } from '@/lib/spool'
import { createManualFilament, validateManualFilament, type ManualFilamentInput } from '@/lib/actions'
import type { ExternalFilament, SpoolmanField, SpoolmanFilament } from '../../../../shared/types'

export interface PickerAction {
  key: string
  label: string
  variant?: 'default' | 'outline'
}

const EMPTY: ManualFilamentInput = {
  vendorName: '',
  name: '',
  material: 'PLA',
  subtype: '',
  colorHex: '1E90FF',
  diameter: '1.75',
  density: '1.24',
  weight: '1000',
  spoolWeight: '200',
  extruderTemp: '210',
  bedTemp: '60',
  price: '',
  articleNumber: '',
  comment: ''
}

// Extra-Schluessel -> Abschnitt (wie in der Detailansicht).
const EXTRA_SECTION: Record<string, 'druck' | 'einkauf' | 'weitere'> = {
  max_volumetric_speed: 'druck',
  orca_preset: 'druck'
}

function fromExternal(e: ExternalFilament): Partial<ManualFilamentInput> {
  return {
    vendorName: e.manufacturer,
    name: e.name,
    material: e.material || 'PLA',
    colorHex: (e.color_hex || '').replace('#', ''),
    diameter: e.diameter ? String(e.diameter) : '1.75',
    density: e.density ? String(e.density) : String(materialDensity(e.material || 'PLA')),
    weight: e.weight ? String(e.weight) : '1000',
    spoolWeight: e.spool_weight ? String(e.spool_weight) : '200',
    extruderTemp: e.extruder_temp ? String(e.extruder_temp) : '',
    bedTemp: e.bed_temp ? String(e.bed_temp) : ''
  }
}

export function FilamentPicker({
  url,
  filamentFields,
  includeOwn,
  actions,
  onResult
}: {
  url: string
  filamentFields: SpoolmanField[]
  includeOwn: boolean
  actions: PickerAction[]
  onResult: (filament: SpoolmanFilament, actionKey: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'own' | 'db' | 'manual'>(includeOwn ? 'own' : 'db')
  const [prefill, setPrefill] = useState<Partial<ManualFilamentInput> | undefined>(undefined)
  const [fromDb, setFromDb] = useState(false)

  const [filaments, setFilaments] = useState<SpoolmanFilament[]>([])

  useEffect(() => {
    if (!url) return
    window.api.spoolman.listFilaments(url).then((r) => {
      if (r.ok && r.data) setFilaments(r.data)
    })
  }, [url])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {includeOwn && (
          <TabBtn active={tab === 'own'} onClick={() => setTab('own')}>{t('lib.tabOwn')}</TabBtn>
        )}
        <TabBtn active={tab === 'db'} onClick={() => setTab('db')}>{t('lib.tabDb')}</TabBtn>
        <TabBtn active={tab === 'manual'} onClick={() => { setPrefill(undefined); setFromDb(false); setTab('manual') }}>
          {t('lib.tabManual')}
        </TabBtn>
      </div>

      {tab === 'own' && includeOwn && (
        <OwnList filaments={filaments} onPick={(f) => onResult(f, 'existing')} />
      )}

      {tab === 'db' && (
        <DbList
          url={url}
          onPick={(e) => {
            setPrefill(fromExternal(e))
            setFromDb(true)
            setTab('manual')
          }}
        />
      )}

      {tab === 'manual' && (
        <FilamentForm
          key={fromDb ? 'db' : 'empty'}
          url={url}
          filamentFields={filamentFields}
          initial={prefill}
          fromDb={fromDb}
          onBackToSearch={() => setTab('db')}
          existingFilaments={filaments}
          actions={actions}
          onResult={onResult}
        />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }): JSX.Element {
  return (
    <Button size="sm" variant={active ? 'default' : 'outline'} onClick={onClick}>
      {children}
    </Button>
  )
}

function OwnList({ filaments, onPick }: { filaments: SpoolmanFilament[]; onPick: (f: SpoolmanFilament) => void }): JSX.Element {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const filtered = filaments.filter((f) =>
    [f.vendor?.name, f.material, f.name].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase())
  )
  return (
    <div className="space-y-2">
      <Input placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {filtered.map((f) => (
          <button key={f.id} onClick={() => onPick(f)} className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent">
            <span className="h-6 w-6 shrink-0 rounded-full border border-border" style={colorStyle(f.color_hex)} />
            <span className="min-w-0 flex-1 truncate">{[f.vendor?.name, f.material, f.name].filter(Boolean).join(' · ')}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('common.nothingFound')}</p>}
      </div>
    </div>
  )
}

function DbList({ url, onPick }: { url: string; onPick: (e: ExternalFilament) => void }): JSX.Element {
  const { t } = useTranslation()
  const [list, setList] = useState<ExternalFilament[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!url) return
    setLoading(true)
    window.api.spoolman.externalFilaments(url).then((r) => {
      if (r.ok && r.data) setList(r.data)
      setLoading(false)
    })
  }, [url])

  const filtered = q
    ? list.filter((e) => [e.manufacturer, e.name, e.material].join(' ').toLowerCase().includes(q.toLowerCase()))
    : list.slice(0, 80)

  return (
    <div className="space-y-2">
      <Input placeholder={t('lib.searchDb')} value={q} onChange={(e) => setQ(e.target.value)} />
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Spinner /> {t('lib.loadingDb')}</div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {filtered.map((e) => (
            <button key={e.id} onClick={() => onPick(e)} className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent">
              <span className="h-6 w-6 shrink-0 rounded-full border border-border" style={colorStyle(e.color_hex)} />
              <span className="min-w-0 flex-1 truncate">{e.manufacturer} · {e.material} · {e.name}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('common.nothingFound')}</p>}
        </div>
      )}
    </div>
  )
}

function FilamentForm({
  url,
  filamentFields,
  initial,
  fromDb,
  onBackToSearch,
  existingFilaments,
  actions,
  onResult
}: {
  url: string
  filamentFields: SpoolmanField[]
  initial?: Partial<ManualFilamentInput>
  fromDb?: boolean
  onBackToSearch?: () => void
  existingFilaments: SpoolmanFilament[]
  actions: PickerAction[]
  onResult: (filament: SpoolmanFilament, actionKey: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [form, setForm] = useState<ManualFilamentInput>({ ...EMPTY, ...initial })
  const [densityTouched, setDensityTouched] = useState(false)
  const [extraVals, setExtraVals] = useState<Record<string, string>>({})
  const [vendors, setVendors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dup, setDup] = useState<{ existing: SpoolmanFilament; actionKey: string } | null>(null)

  useEffect(() => {
    if (!url) return
    window.api.spoolman.listVendors(url).then((r) => {
      if (r.ok && r.data) setVendors(r.data.map((v) => v.name))
    })
  }, [url])

  function set<K extends keyof ManualFilamentInput>(key: K, value: string): void {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function onMaterial(value: string): void {
    setForm((f) => ({ ...f, material: value, density: densityTouched ? f.density : String(materialDensity(value)) }))
  }

  const extraFields = filamentFields.filter((f) => f.key !== 'variant')
  function encodeExtras(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const fld of extraFields) {
      const v = extraVals[fld.key]
      if (v === undefined || v === '') continue
      if (fld.field_type === 'integer' || fld.field_type === 'float') out[fld.key] = encodeExtraValue(Number(v))
      else if (fld.field_type === 'boolean') out[fld.key] = encodeExtraValue(v === 'true')
      else out[fld.key] = encodeExtraValue(v)
    }
    return out
  }

  async function doCreate(actionKey: string): Promise<void> {
    setBusy(true)
    setError(null)
    const res = await createManualFilament(url, form, encodeExtras())
    if (res.ok && res.filament) onResult(res.filament, actionKey)
    else { setError(res.error || t('lib.createFailed')); setBusy(false) }
  }

  function submit(actionKey: string): void {
    setError(null)
    const invalid = validateManualFilament(form)
    if (invalid) { setError(invalid); return }
    // Dublettenpruefung: gleicher Hersteller + Name + Material
    const match = existingFilaments.find(
      (f) =>
        (f.vendor?.name || '').toLowerCase() === form.vendorName.trim().toLowerCase() &&
        (f.name || '').toLowerCase() === form.name.trim().toLowerCase() &&
        (f.material || '').toLowerCase() === form.material.trim().toLowerCase()
    )
    if (match) { setDup({ existing: match, actionKey }); return }
    doCreate(actionKey)
  }

  const extraInSection = (section: 'druck' | 'einkauf' | 'weitere'): JSX.Element[] =>
    extraFields
      .filter((f) => (EXTRA_SECTION[f.key] || 'weitere') === section)
      .map((f) => (
        <ExtraInput key={f.key} field={f} value={extraVals[f.key] ?? ''} onChange={(v) => setExtraVals((p) => ({ ...p, [f.key]: v }))} />
      ))

  return (
    <div className="space-y-4">
      {fromDb && (
        <Alert>
          <div className="flex items-center justify-between gap-2">
            <span>{t('lib.fromDb')}</span>
            {onBackToSearch && (
              <button onClick={onBackToSearch} className="flex shrink-0 items-center gap-1 text-primary hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> {t('lib.backToSearch')}
              </button>
            )}
          </div>
        </Alert>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {dup && (
        <Alert variant="warning">
          <div className="space-y-2">
            <div>
              {t('lib.dupExists', { name: [dup.existing.vendor?.name, dup.existing.name].filter(Boolean).join(' '), material: dup.existing.material })}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { const d = dup; setDup(null); onResult(d.existing, d.actionKey) }}>{t('lib.useExisting')}</Button>
              <Button size="sm" variant="outline" onClick={() => { const d = dup; setDup(null); doCreate(d.actionKey) }}>{t('lib.createAnyway')}</Button>
            </div>
          </div>
        </Alert>
      )}

      <datalist id="fp-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="fp-materials">{COMMON_MATERIALS.map((m) => <option key={m} value={m} />)}</datalist>

      <Section title={t('lib.sGeneral')} cols={2}>
        <Field label={`${t('lib.vendor')} *`}><Input list="fp-vendors" value={form.vendorName} onChange={(e) => set('vendorName', e.target.value)} placeholder={t('lib.phVendor')} /></Field>
        <Field label={`${t('lib.fName')} *`}><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('lib.phName')} /></Field>
        <Field label={`${t('lib.fMaterial')} *`}><Input list="fp-materials" value={form.material} onChange={(e) => onMaterial(e.target.value)} /></Field>
        <Field label={t('lib.fSubtype')}><Input value={form.subtype} onChange={(e) => set('subtype', e.target.value)} placeholder={t('lib.phSubtype')} /></Field>
        <Field label={t('lib.fColor')}>
          <div className="flex items-center gap-2">
            <input type="color" value={'#' + form.colorHex.replace('#', '').padEnd(6, '0').slice(0, 6)} onChange={(e) => set('colorHex', e.target.value.replace('#', '').toUpperCase())} className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-background" />
            <Input value={form.colorHex} onChange={(e) => set('colorHex', e.target.value)} placeholder="1E90FF" />
          </div>
        </Field>
      </Section>

      <Section title={t('lib.sProperties')} cols={2}>
        <Field label={`${t('lib.fDiameter')} (mm) *`}><Input value={form.diameter} onChange={(e) => set('diameter', e.target.value)} /></Field>
        <Field label={`${t('lib.fDensity')} (g/cm³) *`}><Input value={form.density} onChange={(e) => { setDensityTouched(true); set('density', e.target.value) }} /></Field>
        <Field label={`${t('lib.fNetWeight')} (g) *`}><Input value={form.weight} onChange={(e) => set('weight', e.target.value)} /></Field>
        <Field label={t('lib.emptySpoolG')}><Input value={form.spoolWeight} onChange={(e) => set('spoolWeight', e.target.value)} /></Field>
      </Section>

      <Section title={t('lib.sPrintSettings')} cols={2}>
        <Field label={`${t('lib.fNozzleTemp')} (°C)`}><Input value={form.extruderTemp} onChange={(e) => set('extruderTemp', e.target.value)} /></Field>
        <Field label={`${t('lib.fBedTemp')} (°C)`}><Input value={form.bedTemp} onChange={(e) => set('bedTemp', e.target.value)} /></Field>
        {extraInSection('druck')}
      </Section>

      <Section title={t('lib.sPurchase')} cols={2}>
        <Field label={t('lib.fPrice')}><Input value={form.price} onChange={(e) => set('price', e.target.value)} placeholder={t('lib.phPrice')} /></Field>
        <Field label={t('lib.fArticle')}><Input value={form.articleNumber} onChange={(e) => set('articleNumber', e.target.value)} /></Field>
        {extraInSection('einkauf')}
      </Section>

      {extraInSection('weitere').length > 0 && (
        <Section title={t('lib.sMoreFields')} cols={2}>{extraInSection('weitere')}</Section>
      )}

      <Section title={t('lib.sNotes')} cols={1}>
        <Field label={t('lib.fComment')}><Input value={form.comment} onChange={(e) => set('comment', e.target.value)} /></Field>
      </Section>

      <div className="flex justify-end gap-2">
        {actions.map((a, i) => (
          <Button key={a.key} variant={a.variant || (i === 0 ? 'default' : 'outline')} onClick={() => submit(a.key)} loading={busy}>
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ExtraInput({ field, value, onChange }: { field: SpoolmanField; value: string; onChange: (v: string) => void }): JSX.Element {
  const label = field.name || field.key
  if (field.field_type === 'boolean') {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="h-9 pt-0.5"><Switch checked={value === 'true'} onCheckedChange={(v) => onChange(String(v))} /></div>
      </div>
    )
  }
  if (field.field_type === 'choice') {
    return (
      <Field label={label}>
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">–</option>
          {(field.choices || []).map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
    )
  }
  if (field.field_type === 'datetime') {
    return <Field label={label}><Input type="date" value={value} onChange={(e) => onChange(e.target.value)} /></Field>
  }
  const isNum = field.field_type === 'integer' || field.field_type === 'float'
  return (
    <Field label={label + (field.unit ? ` (${field.unit})` : '')}>
      <Input type={isNum ? 'number' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}
