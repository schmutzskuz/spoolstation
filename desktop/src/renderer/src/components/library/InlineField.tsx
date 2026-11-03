import { useEffect, useRef, useState, type RefObject } from 'react'
import { Check, Loader2, AlertCircle, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input, Select, Switch, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'

type SaveFn = (value: string) => Promise<string | null>

interface Common {
  label: string
  unit?: string
  readOnly?: boolean
  placeholder?: string
  className?: string
  min?: number
}

type Props =
  | (Common & { kind: 'text' | 'number' | 'textarea' | 'color' | 'date'; value: string; onSave?: SaveFn })
  | (Common & { kind: 'select'; value: string; options: { value: string; label: string }[]; onSave?: SaveFn })
  | (Common & { kind: 'boolean'; value: string; onSave?: SaveFn })

export function InlineField(props: Props): JSX.Element {
  const { t } = useTranslation()
  const { label, unit, readOnly, className } = props
  const [val, setVal] = useState(props.value)
  const [editing, setEditing] = useState(false)
  const [state, setState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Serverwert nur uebernehmen, wenn gerade NICHT editiert/gespeichert wird,
  // damit Polling/Neuladen die Eingabe nicht ueberschreibt.
  useEffect(() => {
    if (!editing && state !== 'saving') setVal(props.value)
  }, [props.value, editing, state])
  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function validate(next: string): string | null {
    if (props.kind === 'number') {
      if (next.trim() === '') return null
      const n = Number(next.replace(',', '.'))
      if (!isFinite(n)) return t('lib.enterNumber')
      if (props.min !== undefined && n < props.min) return props.min === 0 ? t('lib.notNegative') : t('lib.minValue', { min: props.min })
    }
    return null
  }

  async function commit(raw: string): Promise<void> {
    setEditing(false)
    // Zahlenfelder akzeptieren Komma und Punkt als Dezimaltrenner.
    const next = props.kind === 'number' ? raw.replace(',', '.') : raw
    if (!props.onSave || next === props.value) {
      setErr(null)
      return
    }
    const invalid = validate(next)
    if (invalid) {
      setState('error')
      setErr(invalid)
      return
    }
    setState('saving')
    setErr(null)
    const res = await props.onSave(next)
    if (res === null) {
      setState('ok')
      setTimeout(() => setState('idle'), 2000)
    } else {
      setState('error')
      setErr(res)
    }
  }

  const statusIcon =
    state === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> :
    state === 'ok' ? <Check className="h-3.5 w-3.5 text-success" /> :
    state === 'error' ? <AlertCircle className="h-3.5 w-3.5 text-destructive" /> : null

  const ring = state === 'ok' ? 'ring-1 ring-[hsl(var(--success))]' : state === 'error' ? 'border-destructive ring-1 ring-destructive/40' : ''

  // Wert-Anzeige (Nur-Text, wird beim Klick zum Feld)
  function displayText(): string {
    if (!props.value) return '–'
    return props.value + (unit ? ` ${unit}` : '')
  }

  const controlInline = props.kind === 'select' || props.kind === 'boolean'

  return (
    <div className={cn('flex items-start gap-3 py-1', className)}>
      <div className="w-36 shrink-0 pt-1.5 text-sm text-muted-foreground">{label}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {/* Interaktive Controls (immer sichtbar) */}
          {props.kind === 'boolean' && (
            <Switch checked={val === 'true' || val === '1'} disabled={readOnly} onCheckedChange={(v) => { setVal(String(v)); commit(String(v)) }} />
          )}
          {props.kind === 'select' && (
            <Select value={val} disabled={readOnly} className={cn('h-9', ring)} onChange={(e) => { setVal(e.target.value); commit(e.target.value) }}>
              <option value="">–</option>
              {props.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          )}

          {/* Text/Zahl/Datum/Farbe/Textarea: Anzeige -> Klick -> Feld */}
          {!controlInline && (readOnly ? (
            <span className="pt-1.5 text-sm">{displayText()}</span>
          ) : editing ? (
            props.kind === 'textarea' ? (
              <Textarea ref={inputRef as RefObject<HTMLTextAreaElement>} value={val} placeholder={props.placeholder} className={cn('font-sans', ring)} onChange={(e) => setVal(e.target.value)} onBlur={() => commit(val)} />
            ) : props.kind === 'color' ? (
              <div className="flex items-center gap-2">
                <input type="color" value={'#' + val.replace('#', '').padEnd(6, '0').slice(0, 6)} onChange={(e) => { const v = e.target.value.replace('#', '').toUpperCase(); setVal(v) }} onBlur={() => commit(val)} className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-background" />
                <Input ref={inputRef as RefObject<HTMLInputElement>} value={val} placeholder={props.placeholder} className={cn('h-9', ring)} onChange={(e) => setVal(e.target.value)} onBlur={() => commit(val)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setVal(props.value); setEditing(false); setErr(null); setState('idle') } }} />
              </div>
            ) : (
              <div className="relative flex-1">
                <Input ref={inputRef as RefObject<HTMLInputElement>} type={props.kind === 'number' ? 'number' : props.kind === 'date' ? 'date' : 'text'} value={val} placeholder={props.placeholder} className={cn('h-9', unit ? 'pr-10' : undefined, ring)} onChange={(e) => { setVal(e.target.value); if (state === 'error') { setErr(null); setState('idle') } }} onBlur={() => commit(val)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setVal(props.value); setEditing(false); setErr(null); setState('idle') } }} />
                {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
              </div>
            )
          ) : (
            <button
              onClick={() => { setVal(props.value); setEditing(true) }}
              className={cn('group flex min-h-[32px] flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-accent', state === 'error' && 'text-destructive')}
            >
              {props.kind === 'color' && props.value && <span className="h-4 w-4 shrink-0 rounded-full border border-border" style={{ backgroundColor: `#${props.value.replace('#', '')}` }} />}
              <span className={cn('truncate', !props.value && 'text-muted-foreground')}>{displayText()}</span>
              <Pencil className="ml-auto h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-60" />
            </button>
          ))}

          {statusIcon}
        </div>
        {err && <p className="mt-0.5 text-xs text-destructive">{err}</p>}
      </div>
    </div>
  )
}
