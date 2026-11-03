import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, Plug, ScanLine, PencilLine, Save, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { useUnsavedGuard } from '@/context/NavGuard'
import { FirmwareCard } from '@/components/FirmwareCard'
import { HelpButton } from '@/components/HelpButton'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Switch
} from '@/components/ui'
import type {
  DiscoveredStation,
  NfcJob,
  OpenSpool,
  StationConfig
} from '../../../shared/types'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

const EMPTY_SPOOL: OpenSpool = {
  brand: '',
  type: 'PLA',
  subtype: '',
  color_hex: '1E90FF',
  alpha: 'FF',
  min_temp: '190',
  max_temp: '220',
  bed_min_temp: '50',
  bed_max_temp: '60',
  spool_id: ''
}

function colorStyle(hex?: string): React.CSSProperties {
  const h = (hex || '').replace('#', '')
  return /^[0-9a-fA-F]{6}$/.test(h) ? { backgroundColor: `#${h}` } : { backgroundColor: 'transparent' }
}

export function StationPage({ onFirmwareUsbUpdate }: { onFirmwareUsbUpdate?: () => void } = {}): JSX.Element {
  const { t } = useTranslation()
  const { settings, saveSettings, target, status, connected, refresh } = useConnection()
  const nfcOk = connected && !!status?.nfc_ok

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{t('station.title')}</h1>
          <HelpButton chapter="read-send" />
        </div>
        <p className="text-sm text-muted-foreground">{t('station.subtitle')}</p>
      </div>

      <ConnectCard
        currentHost={settings.stationHost}
        onPick={(host) => saveSettings({ stationHost: host })}
        onRefresh={refresh}
      />

      {connected && status && (
        <Card>
          <CardHeader>
            <CardTitle>{t('station.statusTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
            <Info label={t('station.name')} value={status.name} />
            <Info label={t('station.ip')} value={status.ip} />
            <Info label={t('station.firmware')} value={'v' + status.version} />
            <Info label={t('station.wifiSignal')} value={status.rssi + ' dBm'} />
            <Info label={t('station.uptime')} value={t('station.minutes', { n: Math.floor(status.uptime_s / 60) })} />
            <Info label={t('station.slot')} value={'T' + (status.slot + 1)} />
            <Info label={t('station.nfc')} value={status.nfc_ok ? t('station.ready') : t('station.notAvailable')} />
            <Info label={t('station.statusLabel')} value={status.busy ? t('station.busy') : t('station.idle')} />
          </CardContent>
        </Card>
      )}

      <ReadCard target={target} nfcOk={nfcOk} connected={connected} readTimeout={10000} />
      <WriteCard target={target} nfcOk={nfcOk} connected={connected} />
      <FirmwareCard target={target} connected={connected} onUsbUpdate={onFirmwareUsbUpdate} />
      <ConfigCard target={target} connected={connected} />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}

/* ---------------- Verbinden / Suchen ---------------- */
function ConnectCard({
  currentHost,
  onPick,
  onRefresh
}: {
  currentHost: string
  onPick: (host: string) => void
  onRefresh: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [manual, setManual] = useState(currentHost)
  const [list, setList] = useState<DiscoveredStation[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => setManual(currentHost), [currentHost])

  async function search(): Promise<void> {
    setSearching(true)
    setSearched(false)
    const found = await window.api.discover(3000)
    setList(found)
    setSearched(true)
    setSearching(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('station.connection')}</CardTitle>
        <CardDescription>{t('station.connectionDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label>{t('station.stationAddr')}</Label>
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder={t('station.addrPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onPick(manual.trim())
                  onRefresh()
                }
              }}
            />
          </div>
          <Button
            onClick={() => {
              onPick(manual.trim())
              onRefresh()
            }}
          >
            <Plug className="h-4 w-4" /> {t('station.connect')}
          </Button>
          <Button variant="outline" onClick={search} loading={searching}>
            <Search className="h-4 w-4" /> {t('station.searchBtn')}
          </Button>
        </div>

        {searched && list.length === 0 && <Alert variant="warning">{t('station.noneFound')}</Alert>}

        {list.length > 0 && (
          <div className="space-y-2">
            {list.map((s) => (
              <button
                key={s.host}
                onClick={() => {
                  onPick(s.host)
                  onRefresh()
                }}
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground"> · {s.host}:{s.port}</span>
                </span>
                {s.host === currentHost && <Badge variant="success">{t('station.active')}</Badge>}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------- Tag lesen ---------------- */
function ReadCard({
  target,
  nfcOk,
  connected,
  readTimeout
}: {
  target: { host: string; apiKey: string }
  nfcOk: boolean
  connected: boolean
  readTimeout: number
}): JSX.Element {
  const { t } = useTranslation()
  const [running, setRunning] = useState(false)
  const [job, setJob] = useState<NfcJob | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const cancelRef = useRef(false)

  const poll = useCallback(
    async (timeoutMs: number) => {
      const deadline = Date.now() + timeoutMs + 6000
      while (Date.now() < deadline) {
        if (cancelRef.current) return
        const res = await window.api.station.nfcJob(target)
        if (!res.ok || !res.data) {
          setErr(res.error || t('station.jobFetchError'))
          return
        }
        setJob(res.data)
        if (res.data.state !== 'waiting') return
        await sleep(300)
      }
      setErr(t('station.readTimeoutErr'))
    },
    [target, t]
  )

  async function start(): Promise<void> {
    setErr(null)
    setJob(null)
    cancelRef.current = false
    setRunning(true)
    const res = await window.api.station.nfcRead(target, readTimeout)
    if (!res.ok) {
      setErr(res.status === 409 ? t('station.stationBusy') : res.error || t('station.readFailed'))
      setRunning(false)
      return
    }
    await poll(readTimeout)
    setRunning(false)
  }

  async function cancel(): Promise<void> {
    cancelRef.current = true
    await window.api.station.nfcCancel(target)
    setRunning(false)
  }

  const os = job?.result?.openspool

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('station.readTitle')}</CardTitle>
        <CardDescription>{t('station.readDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected && <Alert>{t('station.connectFirst')}</Alert>}
        {connected && !nfcOk && <Alert variant="warning">{t('station.nfcNotReadyRead')}</Alert>}

        <div className="flex items-center gap-3">
          <Button onClick={start} disabled={!nfcOk || running} loading={running}>
            <ScanLine className="h-4 w-4" /> {t('station.readBtn')}
          </Button>
          {running && (
            <>
              <span className="text-sm text-muted-foreground">{t('station.placeSpool')}</span>
              <Button variant="ghost" size="sm" onClick={cancel}>
                {t('common.cancel')}
              </Button>
            </>
          )}
        </div>

        {err && <Alert variant="danger">{err}</Alert>}

        {job && job.state !== 'waiting' && (
          <div className="space-y-3">
            {job.state === 'timeout' && <Alert variant="warning">{t('station.noTagDetected')}</Alert>}
            {job.state === 'cancelled' && <Alert>{t('station.cancelled')}</Alert>}
            {job.state === 'error' && <Alert variant="danger">{job.error || t('station.error')}</Alert>}

            {job.state === 'done' && job.result && (
              <div className="space-y-3 rounded-md border border-border p-4">
                <div className="flex items-center gap-3">
                  <Badge variant="muted">UID {job.result.uid}</Badge>
                  <Badge variant="muted">{job.result.tag_type}</Badge>
                  {job.result.empty && <Badge variant="warning">{t('station.empty')}</Badge>}
                </div>

                {os ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full border border-border" style={colorStyle(os.color_hex)} />
                      <span className="font-medium">#{(os.color_hex || '').replace('#', '')}</span>
                    </div>
                    <Info label={t('station.manufacturer')} value={os.brand || '–'} />
                    <Info label={t('station.material')} value={os.type || '–'} />
                    <Info label={t('station.subtype')} value={os.subtype || '–'} />
                    <Info label={t('station.nozzleC')} value={`${os.min_temp || '?'}–${os.max_temp || '?'}`} />
                    <Info label={t('station.bedC')} value={`${os.bed_min_temp || '?'}–${os.bed_max_temp || '?'}`} />
                    <Info label={t('station.spoolId')} value={os.spool_id || '–'} />
                  </div>
                ) : (
                  !job.result.empty && <Alert variant="warning">{t('station.noValidJson')}</Alert>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------- Rohdaten schreiben ---------------- */
function WriteCard({
  target,
  nfcOk,
  connected
}: {
  target: { host: string; apiKey: string }
  nfcOk: boolean
  connected: boolean
}): JSX.Element {
  const { t } = useTranslation()
  const [spool, setSpool] = useState<OpenSpool>(EMPTY_SPOOL)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const cancelRef = useRef(false)

  function set<K extends keyof OpenSpool>(key: K, value: string): void {
    setSpool((s) => ({ ...s, [key]: value }))
  }

  async function write(): Promise<void> {
    setResult(null)
    cancelRef.current = false
    setRunning(true)
    const res = await window.api.station.nfcWrite(target, spool, 10000)
    if (!res.ok) {
      setResult({ ok: false, msg: res.status === 409 ? t('station.stationBusyShort') : res.error || t('station.writeFailed') })
      setRunning(false)
      return
    }
    const deadline = Date.now() + 16000
    while (Date.now() < deadline) {
      if (cancelRef.current) break
      const j = await window.api.station.nfcJob(target)
      if (!j.ok || !j.data) {
        setResult({ ok: false, msg: j.error || t('station.jobFetchFailed') })
        setRunning(false)
        return
      }
      if (j.data.state !== 'waiting') {
        if (j.data.state === 'done') setResult({ ok: true, msg: t('station.writeVerified') })
        else if (j.data.state === 'timeout') setResult({ ok: false, msg: t('station.noTagDetected') })
        else setResult({ ok: false, msg: j.data.error || t('station.writeFailed') })
        setRunning(false)
        return
      }
      await sleep(300)
    }
    setResult({ ok: false, msg: t('station.writeTimeout') })
    setRunning(false)
  }

  const fields: { key: keyof OpenSpool; label: string; placeholder?: string }[] = [
    { key: 'brand', label: t('station.manufacturer'), placeholder: 'Polymaker' },
    { key: 'type', label: t('station.material'), placeholder: 'PLA' },
    { key: 'subtype', label: t('station.subtype'), placeholder: 'Matte' },
    { key: 'min_temp', label: t('station.nozzleMinC') },
    { key: 'max_temp', label: t('station.nozzleMaxC') },
    { key: 'bed_min_temp', label: t('station.bedMinC') },
    { key: 'bed_max_temp', label: t('station.bedMaxC') },
    { key: 'spool_id', label: t('station.spoolIdOptional') }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('station.writeTitle')}</CardTitle>
        <CardDescription>{t('station.writeDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected && !nfcOk && <Alert variant="warning">{t('station.nfcNotReadyWrite')}</Alert>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{t('station.colorHex')}</Label>
            <div className="flex items-center gap-2">
              <span className="h-9 w-9 shrink-0 rounded-md border border-border" style={colorStyle(spool.color_hex)} />
              <Input value={spool.color_hex} onChange={(e) => set('color_hex', e.target.value)} placeholder="1E90FF" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('station.alphaHex')}</Label>
            <Input value={spool.alpha} onChange={(e) => set('alpha', e.target.value)} placeholder="FF" />
          </div>
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                value={(spool[f.key] as string) || ''}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={write} disabled={!nfcOk || running} loading={running}>
            <PencilLine className="h-4 w-4" /> {t('station.writeBtn')}
          </Button>
          {running && <span className="text-sm text-muted-foreground">{t('station.placeEmptyTag')}</span>}
        </div>

        {result && (
          <Alert variant={result.ok ? 'default' : 'danger'}>
            <span className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {result.msg}
            </span>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------- Station-Konfiguration ---------------- */
function ConfigCard({
  target,
  connected
}: {
  target: { host: string; apiKey: string }
  connected: boolean
}): JSX.Element {
  const { t } = useTranslation()
  const [cfg, setCfg] = useState<StationConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Basis fuer die Dirty-Erkennung; Serverdaten ueberschreiben Edits nie.
  const loadedRef = useRef('')
  const dirty = !!cfg && JSON.stringify(cfg) !== loadedRef.current
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty
  useUnsavedGuard(dirty)

  // Stabile Primitive als Deps -> kein staendiges Neuladen durch Polling-Rerenders.
  const load = useCallback(async () => {
    if (!connected) return
    setLoading(true)
    setErr(null)
    const res = await window.api.station.getConfig(target)
    if (res.ok && res.data) {
      if (!dirtyRef.current) {
        setCfg(res.data)
        loadedRef.current = JSON.stringify(res.data)
      }
    } else setErr(res.error || t('station.configLoadError'))
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.host, target.apiKey, connected])

  useEffect(() => {
    load()
  }, [load])

  async function save(): Promise<void> {
    if (!cfg) return
    setSaving(true)
    setMsg(null)
    setErr(null)
    const res = await window.api.station.putConfig(target, cfg)
    if (res.ok && res.data) {
      setCfg(res.data)
      loadedRef.current = JSON.stringify(res.data)
      setMsg(t('station.configSaved'))
      setTimeout(() => setMsg(null), 1500)
    } else {
      setErr(res.error || t('station.configSaveError'))
    }
    setSaving(false)
  }

  function upd<K extends keyof StationConfig>(key: K, value: StationConfig[K]): void {
    setCfg((c) => (c ? { ...c, [key]: value } : c))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('station.configTitle')}</CardTitle>
        <CardDescription>{t('station.configDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected && <Alert>{t('station.connectFirst')}</Alert>}
        {connected && loading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
        {err && <Alert variant="danger">{err}</Alert>}

        {cfg && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('station.printerIp')}</Label>
                <Input value={cfg.printer_host} onChange={(e) => upd('printer_host', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('station.printerPort')}</Label>
                <Input
                  type="number"
                  value={cfg.printer_port}
                  onChange={(e) => upd('printer_port', Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('station.spoolmanUrl')}</Label>
                <Input value={cfg.spoolman_url} onChange={(e) => upd('spoolman_url', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('station.deviceName')}</Label>
                <Input value={cfg.device_name} onChange={(e) => upd('device_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('station.readTimeoutMs')}</Label>
                <Input
                  type="number"
                  value={cfg.read_timeout_ms}
                  onChange={(e) => upd('read_timeout_ms', Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm">{t('station.reverseDir')}</span>
                <Switch checked={cfg.enc_reverse} onCheckedChange={(v) => upd('enc_reverse', v)} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={save} loading={saving} disabled={!dirty}>
                <Save className="h-4 w-4" /> {t('common.save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => { dirtyRef.current = false; load() }}
                disabled={loading}
              >
                {t('common.reload')}
              </Button>
              {msg && <span className="text-sm text-success">{msg}</span>}
            </div>
          </>
        )}

        {connected && !cfg && !loading && !err && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> {t('station.noConfig')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
