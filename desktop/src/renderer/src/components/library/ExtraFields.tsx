import { InlineField } from './InlineField'
import { decodeExtraValue, encodeExtraValue } from '@/lib/spool'
import type { SpoolmanField } from '../../../../shared/types'

// Rendert ein einzelnes Extra-Feld passend zu seinem Typ.
export function renderExtraField(
  f: SpoolmanField,
  extra: Record<string, string> | undefined,
  onSave: (key: string, encoded: string) => Promise<string | null>
): JSX.Element {
  const dec = decodeExtraValue(extra?.[f.key])
  const label = f.name || f.key

  if (f.field_type === 'boolean') {
    return <InlineField key={f.key} kind="boolean" label={label} value={dec === true ? 'true' : 'false'} onSave={(v) => onSave(f.key, encodeExtraValue(v === 'true'))} />
  }
  if (f.field_type === 'integer' || f.field_type === 'float') {
    return (
      <InlineField
        key={f.key}
        kind="number"
        label={label}
        unit={f.unit}
        value={typeof dec === 'number' ? String(dec) : ''}
        onSave={(v) => onSave(f.key, v.trim() === '' ? encodeExtraValue(null) : encodeExtraValue(Number(v)))}
      />
    )
  }
  if (f.field_type === 'datetime') {
    const iso = typeof dec === 'string' ? dec.slice(0, 10) : ''
    return <InlineField key={f.key} kind="date" label={label} value={iso} onSave={(v) => onSave(f.key, encodeExtraValue(v))} />
  }
  if (f.field_type === 'choice') {
    return (
      <InlineField
        key={f.key}
        kind="select"
        label={label}
        value={typeof dec === 'string' ? dec : ''}
        options={(f.choices || []).map((c) => ({ value: c, label: c }))}
        onSave={(v) => onSave(f.key, encodeExtraValue(v))}
      />
    )
  }
  return (
    <InlineField
      key={f.key}
      kind="text"
      label={label}
      value={typeof dec === 'string' ? dec : dec !== undefined ? String(dec) : ''}
      onSave={(v) => onSave(f.key, encodeExtraValue(v))}
    />
  )
}
