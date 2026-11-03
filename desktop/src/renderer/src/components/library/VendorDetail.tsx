import { useTranslation } from 'react-i18next'
import { Alert, Badge } from '@/components/ui'
import { InlineField } from './InlineField'
import { renderExtraField } from './ExtraFields'
import { Section } from './Section'
import { useLibrary } from './context'
import { useToast } from '@/context/ToastContext'
import { colorStyle, formatDate } from '@/lib/spool'
import { useNarrow } from '@/lib/useNarrow'
import type { SpoolmanVendor } from '../../../../shared/types'

export function VendorDetail({ vendor }: { vendor: SpoolmanVendor }): JSX.Element {
  const { t } = useTranslation()
  const { url, filaments, vendorFields, reload, select } = useLibrary()
  const { toast } = useToast()
  const [ref, narrow] = useNarrow(560)
  const v = vendor
  const myFilaments = filaments.filter((f) => f.vendor?.id === v.id)

  async function patch(body: Record<string, unknown>): Promise<string | null> {
    const res = await window.api.spoolman.patchVendor(url, v.id, body)
    if (res.ok) { await reload(); return null }
    return res.error || t('lib.saveFailed')
  }
  const saveField =
    (field: keyof SpoolmanVendor, kind: 'str' | 'num', label: string, unit?: string) =>
    async (val: string): Promise<string | null> => {
      const old = v[field]
      const r = await patch({ [field]: kind === 'num' ? (val.trim() === '' ? null : Number(val)) : val })
      if (r === null) toast(t('lib.savedField', { label, value: (val || '–') + (unit ? ' ' + unit : '') }), async () => { await patch({ [field]: old ?? null }) })
      return r
    }
  const saveExtra = async (key: string, encoded: string): Promise<string | null> => {
    const old = v.extra?.[key]
    const r = await patch({ extra: { ...(v.extra || {}), [key]: encoded } })
    if (r === null) toast(t('lib.saved'), async () => { await patch({ extra: { ...(v.extra || {}), [key]: old ?? '""' } }) })
    return r
  }

  return (
    <div ref={ref}>
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
        <div className="text-lg font-semibold">{v.name}</div>
        <div className="text-sm text-muted-foreground">{t('lib.vendorHead', { id: v.id, date: formatDate(v.registered) })}</div>
      </div>

      <div className="space-y-6 px-6 py-5">
        <Section title={t('lib.sGeneral')} cols={2} narrow={narrow}>
          <InlineField kind="text" label={t('lib.fName')} value={v.name || ''} onSave={saveField('name', 'str', t('lib.fName'))} />
          <InlineField kind="number" min={0} label={t('lib.fEmptySpool')} unit="g" value={v.empty_spool_weight != null ? String(v.empty_spool_weight) : ''} onSave={saveField('empty_spool_weight', 'num', t('lib.fEmptyWeight'), 'g')} />
          <InlineField kind="text" label={t('lib.fExternalId')} value={v.external_id || ''} onSave={saveField('external_id', 'str', t('lib.fExternalId'))} />
        </Section>

        <Section title={t('lib.sNotes')} cols={1} narrow={narrow}>
          <InlineField kind="textarea" label={t('lib.fComment')} value={v.comment || ''} onSave={saveField('comment', 'str', t('lib.fComment'))} />
        </Section>

        {vendorFields.length > 0 && (
          <Section title={t('lib.sMoreFields')} cols={2} narrow={narrow}>{vendorFields.map((fld) => renderExtraField(fld, v.extra, saveExtra))}</Section>
        )}

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('lib.filamentsOf', { count: myFilaments.length })}</h3>
          {myFilaments.length === 0 ? (
            <Alert>{t('lib.noFilaments')}</Alert>
          ) : (
            <div className="space-y-1">
              {myFilaments.map((f) => (
                <button key={f.id} onClick={() => select({ kind: 'filament', id: f.id })} className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-1.5 text-left text-sm hover:bg-accent">
                  <span className="h-6 w-6 shrink-0 rounded-full border border-border" style={colorStyle(f.color_hex)} />
                  <span className="min-w-0 flex-1 truncate">{[f.material, f.name].filter(Boolean).join(' · ')}</span>
                  {f.material && <Badge variant="muted">{f.material}</Badge>}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
