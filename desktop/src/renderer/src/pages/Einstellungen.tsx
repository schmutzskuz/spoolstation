import { useEffect, useRef, useState } from 'react'
import { Moon, Sun, Save, Plus, Trash2, Plug, Star, RotateCw, Usb, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { useUpdater } from '@/context/UpdaterContext'
import { useUnsavedGuard } from '@/context/NavGuard'
import { HelpButton } from '@/components/HelpButton'
import { isDraftDirty, needsEmptyListConfirm } from '@/lib/draft'
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
  Select,
  Switch
} from '@/components/ui'
import type { PrinterDef } from '../../../shared/types'

export function EinstellungenPage({ onSetup }: { onSetup?: () => void } = {}): JSX.Element {
  const { t } = useTranslation()
  const { settings, saveSettings } = useConnection()

  const [stationHost, setStationHost] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [spoolmanUrl, setSpoolmanUrl] = useState('')
  const [edited, setEdited] = useState(false) // true, sobald der Nutzer ein Feld aendert
  const [saved, setSaved] = useState(false)

  // Felder aus den Einstellungen uebernehmen, solange der Nutzer nichts bearbeitet hat.
  // Verhindert, dass ein unabhaengiges saveSettings (z. B. Sprachwechsel) laufende Eingaben ueberschreibt.
  useEffect(() => {
    if (edited) return
    setStationHost(settings.stationHost)
    setApiKey(settings.apiKey)
    setSpoolmanUrl(settings.spoolmanUrl)
  }, [settings, edited])

  const dark = settings.theme === 'dark'
  const connDirty =
    edited &&
    (stationHost !== settings.stationHost || apiKey !== settings.apiKey || spoolmanUrl !== settings.spoolmanUrl)
  useUnsavedGuard(connDirty)

  async function save(): Promise<void> {
    await saveSettings({ stationHost: stationHost.trim(), apiKey: apiKey.trim(), spoolmanUrl: spoolmanUrl.trim() })
    setEdited(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{t('settings.title')}</h1>
          <HelpButton chapter="getting-started" />
        </div>
        <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <div className="text-sm font-medium">{t('wizard.title')}</div>
            <div className="text-sm text-muted-foreground">{t('wizard.subtitle')}</div>
          </div>
          <Button variant="outline" onClick={onSetup}>
            <Usb className="h-4 w-4" /> {t('wizard.title')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearance')}</CardTitle>
          <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {dark ? t('settings.darkMode') : t('settings.lightMode')}
            </div>
            <Switch checked={dark} onCheckedChange={(v) => saveSettings({ theme: v ? 'dark' : 'light' })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('settings.language')}</Label>
            <Select
              value={settings.lang || 'de'}
              className="w-48"
              onChange={(e) => saveSettings({ lang: e.target.value as 'de' | 'en' | 'es' })}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.connections')}</CardTitle>
          <CardDescription>{t('settings.connectionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('settings.stationAddr')}</Label>
            <Input value={stationHost} onChange={(e) => { setEdited(true); setStationHost(e.target.value) }} placeholder="192.168.1.60" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('settings.apiKey')}</Label>
            <Input type="password" value={apiKey} onChange={(e) => { setEdited(true); setApiKey(e.target.value) }} placeholder={t('settings.apiKeyPlaceholder')} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('settings.spoolmanUrl')}</Label>
            <Input value={spoolmanUrl} onChange={(e) => { setEdited(true); setSpoolmanUrl(e.target.value) }} placeholder="http://192.168.1.50:7912" />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={!connDirty}>
              <Save className="h-4 w-4" /> {t('common.save')}
            </Button>
            {saved && <span className="text-sm text-success">{t('common.saved')}</span>}
          </div>
        </CardContent>
      </Card>

      <PrintersCard />

      <UpdateCard />
    </div>
  )
}

function UpdateCard(): JSX.Element {
  const { t } = useTranslation()
  const { app, checkApp, installApp, setAuto, setChannel } = useUpdater()

  const configured = app?.configured ?? false
  const checking = app?.status === 'checking'

  function statusText(): string {
    if (!app) return ''
    if (!app.configured) return t('update.notConfigured')
    if (!app.packaged) return t('update.devOnly')
    switch (app.status) {
      case 'checking':
        return t('update.state.checking')
      case 'available':
        return t('update.state.available', { version: app.newVersion || '' })
      case 'downloading':
        return t('update.downloading', { version: app.newVersion || '' })
      case 'downloaded':
        return t('update.ready', { version: app.newVersion || '' })
      case 'not-available':
        return t('update.state.upToDate')
      case 'error':
        return t(`update.err.${app.error || 'generic'}`)
      default:
        return t('update.state.idle')
    }
  }

  return (
    <Card id="update-settings" className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{t('update.title')}</CardTitle>
        <CardDescription>{t('update.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && <Alert>{t('update.notConfigured')}</Alert>}

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">{t('update.appVersion')}</div>
            <div className="text-muted-foreground">v{app?.version || '–'}</div>
          </div>
          <Badge variant={app?.status === 'error' ? 'warning' : 'muted'}>{statusText()}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">{t('update.autoCheck')}</span>
          <Switch checked={app?.autoCheck ?? true} onCheckedChange={(v) => setAuto(v)} />
        </div>

        <div className="space-y-1.5">
          <Label>{t('update.channel')}</Label>
          <Select
            value={app?.channel || 'stable'}
            className="w-48"
            onChange={(e) => setChannel(e.target.value as 'stable' | 'beta')}
          >
            <option value="stable">{t('update.channelStable')}</option>
            <option value="beta">{t('update.channelBeta')}</option>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={checkApp} loading={checking} disabled={!configured}>
            <RefreshCw className="h-4 w-4" /> {t('update.checkNow')}
          </Button>
          {app?.status === 'downloaded' && (
            <Button onClick={installApp}>
              <RefreshCw className="h-4 w-4" /> {t('update.restartInstall')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PrintersCard(): JSX.Element {
  const { t } = useTranslation()
  const { printers, connected, configLoaded, savePrinters } = useConnection()
  const [list, setList] = useState<PrinterDef[]>([])
  const [edited, setEdited] = useState(false) // true, sobald der Nutzer wirklich etwas aendert
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tested, setTested] = useState<Record<number, 'busy' | 'ok' | 'fail'>>({})
  const [serverChanged, setServerChanged] = useState(false)

  // Zuletzt vom Server (Station) uebernommener Stand als Vergleichsbasis.
  const baseRef = useRef('')
  // "Geaendert" = Entwurf vs. zuletzt geladener Stand, und NUR wenn der Nutzer editiert hat.
  const dirty = isDraftDirty(edited, JSON.stringify(list), baseRef.current)
  useUnsavedGuard(dirty)

  // Serverdaten uebernehmen, solange der Nutzer nichts bearbeitet hat; sonst Hinweis.
  // Vergleich immer gegen den zuletzt geladenen Stand (baseRef), nie gegen "leer".
  useEffect(() => {
    const srv = JSON.stringify(printers)
    if (!edited) {
      setList(printers)
      baseRef.current = srv
      setServerChanged(false)
    } else if (srv !== baseRef.current) {
      setServerChanged(true)
    }
  }, [printers, edited])

  function reloadFromServer(): void {
    setList(printers)
    baseRef.current = JSON.stringify(printers)
    setEdited(false)
    setServerChanged(false)
  }

  function upd(i: number, patch: Partial<PrinterDef>): void {
    setEdited(true)
    setList((l) => l.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  function add(): void {
    setEdited(true)
    setList((l) => (l.length >= 4 ? l : [...l, { name: `Drucker ${l.length + 1}`, host: '', port: 7125 }]))
  }
  function remove(i: number): void {
    setEdited(true)
    setList((l) => l.filter((_, idx) => idx !== i))
  }
  function makeDefault(i: number): void {
    setEdited(true)
    setList((l) => {
      const copy = [...l]
      const [p] = copy.splice(i, 1)
      copy.unshift(p)
      return copy
    })
  }

  async function test(i: number): Promise<void> {
    const p = list[i]
    setTested((t) => ({ ...t, [i]: 'busy' }))
    const res = await window.api.printer.query({ host: p.host, port: p.port })
    setTested((t) => ({ ...t, [i]: res.ok ? 'ok' : 'fail' }))
  }

  async function save(): Promise<void> {
    const clean = list.filter((p) => p.host.trim()).map((p) => ({ name: p.name.trim() || p.host, host: p.host.trim(), port: Number(p.port) || 7125 }))
    // Sicherheitsnetz: leere Liste nie an die Station schicken, wenn vorher Drucker da waren.
    if (needsEmptyListConfirm(clean.length, baseRef.current) && !window.confirm(t('settings.confirmEmptyPrinters'))) return

    setBusy(true)
    setMsg(null)
    setErr(null)
    const res = await savePrinters(clean)
    if (res.ok) {
      baseRef.current = JSON.stringify(clean)
      setList(clean)
      setEdited(false)
      setServerChanged(false)
      setMsg(t('settings.sentToStation'))
      setTimeout(() => setMsg(null), 1500)
    } else {
      setErr(res.error || t('common.save'))
    }
    setBusy(false)
  }

  const ready = connected && configLoaded

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.printers')}</CardTitle>
        <CardDescription>{t('settings.printersDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected && <Alert variant="warning">{t('settings.connectFirst')}</Alert>}
        {connected && !configLoaded && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
        {err && <Alert variant="danger">{err}</Alert>}
        {serverChanged && (
          <Alert variant="warning">
            <span className="flex items-center justify-between gap-2">
              {t('settings.serverChanged')}
              <Button size="sm" variant="outline" onClick={reloadFromServer}>
                <RotateCw className="h-4 w-4" /> {t('common.reload')}
              </Button>
            </span>
          </Alert>
        )}

        {ready && (
          <>
            <div className="space-y-2">
              {list.map((p, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border border-border p-2">
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">{t('settings.name')}</Label>
                    <Input value={p.name} onChange={(e) => upd(i, { name: e.target.value })} />
                  </div>
                  <div className="min-w-[160px] flex-1 space-y-1">
                    <Label className="text-xs">{t('settings.host')}</Label>
                    <Input value={p.host} onChange={(e) => upd(i, { host: e.target.value })} placeholder="192.168.1.42" />
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">{t('settings.port')}</Label>
                    <Input type="number" value={p.port} onChange={(e) => upd(i, { port: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="flex items-center gap-1 pb-0.5">
                    {i === 0 ? (
                      <Badge variant="muted">{t('common.default')}</Badge>
                    ) : (
                      <Button size="icon" variant="ghost" className="h-9 w-9" title={t('settings.asDefault')} onClick={() => makeDefault(i)}>
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="outline" className="h-9 w-9" title={t('common.test')} onClick={() => test(i)} loading={tested[i] === 'busy'}>
                      <Plug className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-9 w-9" title={t('common.delete')} onClick={() => remove(i)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {tested[i] === 'ok' && <span className="text-xs text-success">{t('settings.reachable')}</span>}
                    {tested[i] === 'fail' && <span className="text-xs text-destructive">{t('settings.notReachable')}</span>}
                  </div>
                </div>
              ))}
              {list.length === 0 && <p className="text-sm text-muted-foreground">{t('settings.noPrinterYet')}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={add} disabled={list.length >= 4}>
                <Plus className="h-4 w-4" /> {t('settings.addPrinter')}
              </Button>
              <Button onClick={save} loading={busy} disabled={!dirty}>
                <Save className="h-4 w-4" /> {t('common.save')}
              </Button>
              {msg && <span className="text-sm text-success">{msg}</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
