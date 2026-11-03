import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { Alert, Button, Dialog, Input, Label } from '@/components/ui'
import { FilamentPicker } from '@/components/library/FilamentPicker'
import { writeTagForSpool } from '@/lib/actions'
import type { SpoolmanField, SpoolmanFilament, SpoolmanSpool } from '../../../shared/types'

export function NewSpoolWizard({
  open,
  onClose,
  onCreated,
  startFilament
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  startFilament?: SpoolmanFilament
}): JSX.Element | null {
  const { t } = useTranslation()
  const { settings, target, status, connected } = useConnection()
  const url = settings.spoolmanUrl
  const canWriteTag = connected && !!status?.nfc_ok

  const [step, setStep] = useState(1)
  const [filament, setFilament] = useState<SpoolmanFilament | null>(null)
  const [initialWeight, setInitialWeight] = useState('1000')
  const [spoolWeight, setSpoolWeight] = useState('200')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdSpool, setCreatedSpool] = useState<SpoolmanSpool | null>(null)
  const [writeMsg, setWriteMsg] = useState<string | null>(null)
  const [fields, setFields] = useState<SpoolmanField[]>([])

  useEffect(() => {
    if (!open) return
    setError(null)
    setCreatedSpool(null)
    setWriteMsg(null)
    if (startFilament) {
      setFilament(startFilament)
      setInitialWeight(String(startFilament.weight || 1000))
      setSpoolWeight(String(startFilament.spool_weight || 200))
      setStep(2)
    } else {
      setFilament(null)
      setInitialWeight('1000')
      setSpoolWeight('200')
      setStep(1)
    }
  }, [open, startFilament])

  useEffect(() => {
    if (open && url) window.api.spoolman.listFields(url, 'filament').then((r) => { if (r.ok && r.data) setFields(r.data) })
  }, [open, url])

  function goStep2(f: SpoolmanFilament): void {
    setFilament(f)
    setInitialWeight(String(f.weight || 1000))
    setSpoolWeight(String(f.spool_weight || 200))
    setStep(2)
  }

  async function createSpool(): Promise<void> {
    if (!filament) return
    setBusy(true)
    setError(null)
    const res = await window.api.spoolman.createSpool(url, {
      filament_id: filament.id,
      initial_weight: Number(initialWeight) || undefined,
      spool_weight: Number(spoolWeight) || undefined
    })
    if (res.ok && res.data) {
      setCreatedSpool(res.data)
      setStep(3)
      onCreated()
    } else setError(res.error || t('lib.createSpoolFailed'))
    setBusy(false)
  }

  async function writeTag(): Promise<void> {
    if (!createdSpool) return
    setBusy(true)
    setWriteMsg(null)
    setError(null)
    const res = await writeTagForSpool(target, url, createdSpool)
    if (res.ok) setWriteMsg(res.msg)
    else {
      // Tag schreiben fehlgeschlagen -> frisch angelegte Spule wieder aufraeumen
      await window.api.spoolman.deleteSpool(url, createdSpool.id)
      setCreatedSpool(null)
      setError(res.msg + t('lib.spoolRemovedAgain'))
      setStep(2)
    }
    setBusy(false)
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('lib.newSpool')}
      description={t('lib.stepOf', { step })}
      wide
      footer={
        <>
          {step === 2 && !startFilament && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={busy}>{t('common.back')}</Button>
          )}
          {step === 2 && <Button onClick={createSpool} loading={busy}>{t('lib.createSpool')}</Button>}
          {step === 3 && <Button onClick={onClose} variant={writeMsg ? 'default' : 'outline'}>{t('common.done')}</Button>}
        </>
      }
    >
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      {step === 1 && (
        <FilamentPicker
          url={url}
          filamentFields={fields}
          includeOwn
          actions={[{ key: 'next', label: t('lib.createAndNext') }]}
          onResult={(f) => goStep2(f)}
        />
      )}

      {step === 2 && filament && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {t('lib.filamentLabel')} <span className="font-medium text-foreground">{[filament.vendor?.name, filament.material, filament.name].filter(Boolean).join(' · ')}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>{t('lib.netWeightG')}</Label><Input type="number" value={initialWeight} onChange={(e) => setInitialWeight(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('lib.emptySpoolWeightG')}</Label><Input type="number" value={spoolWeight} onChange={(e) => setSpoolWeight(e.target.value)} /></div>
          </div>
          <p className="text-sm text-muted-foreground">{t('lib.afterCreateHint')}</p>
        </div>
      )}

      {step === 3 && createdSpool && (
        <div className="space-y-4">
          <Alert>{t('lib.spoolCreated', { id: createdSpool.id })}</Alert>
          {!canWriteTag && <Alert variant="warning">{t('lib.needStationForTag')}</Alert>}
          {writeMsg ? <Alert>{writeMsg}</Alert> : <Button onClick={writeTag} loading={busy} disabled={!canWriteTag}>{t('lib.writeTagNow')}</Button>}
        </div>
      )}
    </Dialog>
  )
}
