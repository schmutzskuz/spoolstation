import { useEffect, useRef, useState } from 'react'
import { Usb, Wifi, Printer, Check, RefreshCw, AlertTriangle, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { Alert, Button, Dialog, Input, Label, Select, Spinner } from '@/components/ui'
import { StationSerial, generateApiKey, waitForStation } from '@/lib/stationSerial'
import { requestStationPort, openStationPort, serialSupported, type StationPort } from '@/lib/webSerial'
import { flashFactory, flashFirmwareKeepSettings } from '@/lib/flasher'
import type { PrinterDef } from '../../../shared/types'

type Step = 'lang' | 'spoolman' | 'printer' | 'method' | 'usb' | 'pair' | 'done'
// 'fw-update' = nur Firmware per USB aktualisieren, Einstellungen (NVS) behalten.
type Method = 'usb' | 'pair-usb' | 'pair-net' | 'fw-update'

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function SetupWizard({
  open,
  onClose,
  initialMode
}: {
  open: boolean
  onClose: () => void
  // Wird gesetzt, wenn der Assistent direkt in einem bestimmten Modus starten soll
  // (z. B. "fw-update" vom Station-Hinweis "bitte einmal per USB aktualisieren").
  initialMode?: Method
}): JSX.Element | null {
  const { t } = useTranslation()
  const { settings, saveSettings } = useConnection()

  const [step, setStep] = useState<Step>('lang')
  const [lang, setLang] = useState<'de' | 'en' | 'es'>(settings.lang || 'de')
  const [spoolmanUrl, setSpoolmanUrl] = useState(settings.spoolmanUrl || '')
  const [spoolmanState, setSpoolmanState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [printer, setPrinter] = useState<PrinterDef>({ name: 'Snapmaker U1', host: '', port: 7125 })
  const [printerState, setPrinterState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [method, setMethod] = useState<Method>('usb')
  const [eraseAll, setEraseAll] = useState(true)

  // USB-Flow
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [flashPct, setFlashPct] = useState<number | null>(null)
  const [flashStep, setFlashStep] = useState('')
  const [needReset, setNeedReset] = useState(false)
  const [networks, setNetworks] = useState<{ ssid: string; rssi: number; enc: boolean }[]>([])
  const [scanning, setScanning] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualSsid, setManualSsid] = useState('')
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPass, setWifiPass] = useState('')
  const portRef = useRef<StationPort | null>(null)
  const ssRef = useRef<StationSerial | null>(null)
  const rawPortRef = useRef<Awaited<ReturnType<typeof requestStationPort>> | null>(null)

  // Netzwerk-Kopplung
  const [netHost, setNetHost] = useState('')
  const [netKey, setNetKey] = useState('')

  // Direktstart in einem Modus (z. B. Firmware-Update per USB vom Station-Hinweis).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current && initialMode) {
      setMethod(initialMode)
      setStep('usb')
      setErr(null)
      setFlashPct(null)
      setNeedReset(false)
    }
    wasOpen.current = open
  }, [open, initialMode])

  if (!open) return null

  async function testSpoolman(): Promise<void> {
    setSpoolmanState('idle')
    const r = await window.api.spoolman.info(spoolmanUrl.trim())
    setSpoolmanState(r.ok ? 'ok' : 'fail')
  }
  async function testPrinter(): Promise<void> {
    setPrinterState('idle')
    const r = await window.api.printer.query({ host: printer.host.trim(), port: Number(printer.port) || 7125 })
    setPrinterState(r.ok ? 'ok' : 'fail')
  }

  async function cleanupPort(): Promise<void> {
    ssRef.current?.dispose()
    ssRef.current = null
    if (portRef.current) { await portRef.current.close().catch(() => {}); portRef.current = null }
  }

  // WLAN-Scan mit bis zu 3 Versuchen; rohe Antwort fuer Debugging loggen.
  async function doScan(): Promise<void> {
    const ss = ssRef.current
    if (!ss) return
    setScanning(true); setErr(null)
    try {
      let nets: { ssid: string; rssi: number; enc: boolean }[] = []
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await ss.scanWifi()
        // eslint-disable-next-line no-console
        console.log('[scan_wifi] raw:', JSON.stringify(r))
        nets = (r.networks as typeof nets) || []
        if (nets.length) break
      }
      setNetworks(nets)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('[scan_wifi] error:', (e as Error).message)
    } finally {
      setScanning(false)
    }
  }

  // Port oeffnen, Neustart ausloesen, auf die Station warten (ready/hello), dann WLANs scannen.
  async function handshake(): Promise<void> {
    await cleanupPort()
    const rawPort = rawPortRef.current
    if (!rawPort) throw new Error('kein Port')
    const sp = await openStationPort(rawPort, true)
    portRef.current = sp
    const ss = new StationSerial(sp.io)
    ssRef.current = ss
    await waitForStation(sp.io, ss)
    setFlashPct(null)
    setStep('pair')
    void doScan()
  }

  // USB: Port waehlen, optional flashen, dann Handshake.
  async function usbConnect(): Promise<void> {
    setErr(null); setNeedReset(false); setBusy(true); setFlashPct(null)
    try {
      const rawPort = await requestStationPort()
      rawPortRef.current = rawPort
      if (method === 'usb' && eraseAll) {
        const fw = await window.api.firmware.get()
        if (!fw.ok || !fw.dataBase64) throw new Error(t('wizard.noFirmware'))
        setFlashStep(t('wizard.flashConnect'))
        await flashFactory(rawPort, base64ToBytes(fw.dataBase64), {
          erase: true,
          onProgress: (p) => { setFlashPct(p.pct); setFlashStep(t('wizard.flash_' + p.step)) }
        })
        setFlashStep(t('wizard.flashReboot'))
      }
      await handshake()
    } catch (e) {
      setErr((e as Error).message); setNeedReset(true); await cleanupPort()
    } finally {
      setBusy(false)
    }
  }

  // Nur Firmware aktualisieren, Einstellungen behalten: ota.bin in die App-Partition
  // schreiben (NVS bleibt), Station startet neu. Kein WLAN/Schluessel/Config noetig.
  async function usbFirmwareUpdate(): Promise<void> {
    setErr(null); setNeedReset(false); setBusy(true); setFlashPct(null)
    try {
      const rawPort = await requestStationPort()
      rawPortRef.current = rawPort
      const fw = await window.api.firmware.getOta()
      if (!fw.ok || !fw.dataBase64) throw new Error(t('wizard.noFirmware'))
      setFlashStep(t('wizard.flashConnect'))
      await flashFirmwareKeepSettings(rawPort, base64ToBytes(fw.dataBase64), {
        onProgress: (p) => { setFlashPct(p.pct); setFlashStep(t('wizard.flash_' + p.step)) }
      })
      // Port freigeben; die Station startet mit neuer Firmware und alten Einstellungen.
      await new Promise((r) => setTimeout(r, 400))
      setFlashPct(null)
      setStep('done')
    } catch (e) {
      setErr((e as Error).message); setNeedReset(true)
    } finally {
      setBusy(false)
    }
  }

  // Erneut versuchen (ohne neu zu flashen): nur Handshake.
  async function retryConnect(): Promise<void> {
    setErr(null); setNeedReset(false); setBusy(true)
    try { await handshake() } catch (e) { setErr((e as Error).message); setNeedReset(true); await cleanupPort() } finally { setBusy(false) }
  }

  // USB: WLAN setzen, Schluessel erzeugen, Config uebertragen, Neustart, in App speichern.
  async function usbProvision(): Promise<void> {
    setErr(null); setBusy(true)
    try {
      const ss = ssRef.current
      if (!ss) throw new Error('kein Port')
      const ssid = (manualMode ? manualSsid : wifiSsid).trim()
      const wifi = await ss.setWifi(ssid, wifiPass)
      if (!wifi.ok) throw new Error(String(wifi.error || t('wizard.wifiFail')))

      const key = generateApiKey()
      const kr = await ss.setKey(key)
      if (!kr.ok) throw new Error(String(kr.error || 'set_key'))

      const printers: PrinterDef[] = printer.host.trim()
        ? [{ name: printer.name.trim() || printer.host, host: printer.host.trim(), port: Number(printer.port) || 7125 }]
        : []
      await ss.setConfig({ lang, spoolman_url: spoolmanUrl.trim(), device_name: 'spoolstation', printers })

      const host = String(wifi.ip || 'spoolstation.local')
      await ss.reboot().catch(() => {})
      await cleanupPort()

      await saveSettings({ lang, spoolmanUrl: spoolmanUrl.trim(), stationHost: host, apiKey: key, slotSpools: settings.slotSpools })
      setStep('done')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Vorhandene Station per Netzwerk koppeln: Schluessel manuell, /api/status testen.
  async function pairNetwork(): Promise<void> {
    setErr(null); setBusy(true)
    try {
      const target = { host: netHost.trim(), apiKey: netKey.trim() }
      const r = await window.api.station.status(target)
      if (!r.ok) throw new Error(t('wizard.pairFail'))
      await saveSettings({ stationHost: netHost.trim(), apiKey: netKey.trim(), lang, spoolmanUrl: spoolmanUrl.trim() })
      setStep('done')
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function close(): Promise<void> { await cleanupPort(); onClose() }

  const title = t('wizard.title')

  return (
    <Dialog open onClose={close} title={title} wide description={t('wizard.subtitle')}>
      {err && <Alert variant="danger" className="mb-3">{err}</Alert>}

      {step === 'lang' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('settings.language')}</Label>
            <Select value={lang} className="w-48" onChange={(e) => setLang(e.target.value as 'de' | 'en' | 'es')}>
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </Select>
          </div>
          <Footer onNext={() => setStep('spoolman')} nextLabel={t('common.next')} />
        </div>
      )}

      {step === 'spoolman' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('settings.spoolmanUrl')}</Label>
            <div className="flex gap-2">
              <Input value={spoolmanUrl} onChange={(e) => { setSpoolmanUrl(e.target.value); setSpoolmanState('idle') }} placeholder="http://…:7912" />
              <Button variant="outline" onClick={testSpoolman}><RefreshCw className="h-4 w-4" /> {t('common.test')}</Button>
            </div>
            {spoolmanState === 'ok' && <p className="text-xs text-success">{t('wizard.reachable')}</p>}
            {spoolmanState === 'fail' && <p className="text-xs text-destructive">{t('wizard.notReachable')}</p>}
          </div>
          <Footer onBack={() => setStep('lang')} onNext={() => setStep('printer')} nextLabel={t('common.next')} skipLabel={t('wizard.skip')} onSkip={() => setStep('printer')} />
        </div>
      )}

      {step === 'printer' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1"><Label className="text-xs">{t('settings.name')}</Label><Input value={printer.name} onChange={(e) => setPrinter({ ...printer, name: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">{t('settings.host')}</Label><Input value={printer.host} onChange={(e) => { setPrinter({ ...printer, host: e.target.value }); setPrinterState('idle') }} placeholder="192.168.…" /></div>
            <div className="space-y-1"><Label className="text-xs">{t('settings.port')}</Label><Input type="number" value={printer.port} onChange={(e) => setPrinter({ ...printer, port: Number(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={testPrinter}><Printer className="h-4 w-4" /> {t('common.test')}</Button>
            {printerState === 'ok' && <span className="text-xs text-success">{t('wizard.reachable')}</span>}
            {printerState === 'fail' && <span className="text-xs text-destructive">{t('wizard.notReachable')}</span>}
          </div>
          <Footer onBack={() => setStep('spoolman')} onNext={() => setStep('method')} nextLabel={t('common.next')} skipLabel={t('wizard.skip')} onSkip={() => setStep('method')} />
        </div>
      )}

      {step === 'method' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('wizard.methodHint')}</p>
          {!serialSupported() && <Alert variant="warning">{t('wizard.noSerial')}</Alert>}
          <div className="grid gap-2">
            <MethodCard icon={<Usb className="h-5 w-5" />} active={method === 'usb'} title={t('wizard.methodNew')} desc={t('wizard.methodNewDesc')} onClick={() => setMethod('usb')} disabled={!serialSupported()} />
            <MethodCard icon={<Download className="h-5 w-5" />} active={method === 'fw-update'} title={t('wizard.methodFwUpdate')} desc={t('wizard.methodFwUpdateDesc')} onClick={() => setMethod('fw-update')} disabled={!serialSupported()} />
            <MethodCard icon={<Usb className="h-5 w-5" />} active={method === 'pair-usb'} title={t('wizard.methodPairUsb')} desc={t('wizard.methodPairUsbDesc')} onClick={() => setMethod('pair-usb')} disabled={!serialSupported()} />
            <MethodCard icon={<Wifi className="h-5 w-5" />} active={method === 'pair-net'} title={t('wizard.methodPairNet')} desc={t('wizard.methodPairNetDesc')} onClick={() => setMethod('pair-net')} />
          </div>
          <Footer onBack={() => setStep('printer')} onNext={() => setStep(method === 'pair-net' ? 'pair' : 'usb')} nextLabel={t('common.next')} />
        </div>
      )}

      {step === 'usb' && (
        <div className="space-y-4">
          {method === 'usb' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={eraseAll} onChange={() => setEraseAll(true)} /> {t('wizard.eraseAll')}</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={!eraseAll} onChange={() => setEraseAll(false)} /> {t('wizard.keepFw')}</label>
            </div>
          )}
          {method === 'fw-update' && (
            <p className="text-sm text-muted-foreground">{t('wizard.fwUpdateHint')}</p>
          )}
          <Alert>
            <span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4" /> {t('wizard.usbHint')}</span>
          </Alert>
          {flashPct !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground"><span>{flashStep}</span><span>{flashPct} %</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${flashPct}%` }} /></div>
            </div>
          )}
          {needReset && <Alert variant="warning"><span className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4" /> {t('wizard.pressEn')}</span></Alert>}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep('method')}>{t('common.back')}</Button>
            <div className="flex gap-2">
              {needReset && (
                <Button variant="outline" onClick={method === 'fw-update' ? usbFirmwareUpdate : retryConnect} loading={busy}>{t('lib.retry')}</Button>
              )}
              <Button onClick={method === 'fw-update' ? usbFirmwareUpdate : usbConnect} loading={busy}>{t('wizard.connect')}</Button>
            </div>
          </div>
        </div>
      )}

      {step === 'pair' && (method === 'usb' || method === 'pair-usb') && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('wizard.wifiNetwork')}</Label>
            {scanning ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground"><Spinner /> {t('wizard.scanning')}</div>
            ) : manualMode ? (
              <Input value={manualSsid} onChange={(e) => setManualSsid(e.target.value)} placeholder={t('wizard.wifiName')} autoFocus />
            ) : (
              <div className="flex gap-2">
                <Select value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className="flex-1">
                  <option value="">{t('wizard.chooseWifi')}</option>
                  {networks.map((n) => <option key={n.ssid} value={n.ssid}>{n.ssid} ({n.rssi} dBm){n.enc ? ' 🔒' : ''}</option>)}
                </Select>
                <Button variant="outline" onClick={doScan} title={t('wizard.rescan')}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <button className="text-xs text-primary hover:underline" onClick={() => setManualMode(!manualMode)}>
                {manualMode ? t('wizard.chooseFromList') : t('wizard.otherNetwork')}
              </button>
              <span className="text-xs text-muted-foreground">{t('wizard.band24')}</span>
            </div>
          </div>
          <div className="space-y-1.5"><Label>{t('wizard.wifiPassword')}</Label><Input type="password" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} /></div>
          <Footer onNext={usbProvision} nextLabel={t('wizard.finish')} busy={busy} disabled={!(manualMode ? manualSsid : wifiSsid)} />
        </div>
      )}

      {step === 'pair' && method === 'pair-net' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('wizard.pairNetHint')}</p>
          <div className="space-y-1.5"><Label>{t('settings.stationAddr')}</Label><Input value={netHost} onChange={(e) => setNetHost(e.target.value)} placeholder="spoolstation.local" /></div>
          <div className="space-y-1.5"><Label>{t('settings.apiKey')}</Label><Input value={netKey} onChange={(e) => setNetKey(e.target.value)} /></div>
          <Footer onBack={() => setStep('method')} onNext={pairNetwork} nextLabel={t('wizard.pair')} busy={busy} disabled={!netHost || !netKey} />
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4 py-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/20"><Check className="h-6 w-6 text-success" /></div>
          <div className="text-lg font-semibold">{method === 'fw-update' ? t('wizard.fwDoneTitle') : t('wizard.doneTitle')}</div>
          <p className="text-sm text-muted-foreground">{method === 'fw-update' ? t('wizard.fwDoneHint') : t('wizard.doneHint')}</p>
          <div className="flex justify-center"><Button onClick={close}>{t('common.done')}</Button></div>
        </div>
      )}
    </Dialog>
  )
}

function MethodCard({ icon, title, desc, active, onClick, disabled }: { icon: JSX.Element; title: string; desc: string; active: boolean; onClick: () => void; disabled?: boolean }): JSX.Element {
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-start gap-3 rounded-md border p-3 text-left transition ${active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <span className="mt-0.5 text-primary">{icon}</span>
      <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{desc}</span></span>
    </button>
  )
}

function Footer({ onBack, onNext, onSkip, nextLabel, skipLabel, busy, disabled }: { onBack?: () => void; onNext?: () => void; onSkip?: () => void; nextLabel?: string; skipLabel?: string; busy?: boolean; disabled?: boolean }): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between pt-2">
      <div>{onBack && <Button variant="ghost" onClick={onBack}>{t('common.back')}</Button>}</div>
      <div className="flex gap-2">
        {onSkip && <Button variant="ghost" onClick={onSkip}>{skipLabel}</Button>}
        {onNext && <Button onClick={onNext} loading={busy} disabled={disabled}>{nextLabel}</Button>}
      </div>
    </div>
  )
}
