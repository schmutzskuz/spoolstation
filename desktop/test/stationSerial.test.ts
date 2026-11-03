import { describe, it, expect } from 'vitest'
import {
  StationSerial,
  encodeCommand,
  parseReply,
  splitLines,
  generateApiKey,
  type LineIO
} from '../src/renderer/src/lib/stationSerial'

// Simulierte Station: reagiert auf Befehle mit @@SS-Antworten (plus Log-Rauschen).
class FakeStation implements LineIO {
  private cbs: ((l: string) => void)[] = []
  configured = false
  wifiOk = true

  onLine(cb: (l: string) => void): () => void {
    this.cbs.push(cb)
    return () => {}
  }
  private emit(line: string): void { for (const cb of this.cbs) cb(line) }

  async write(line: string): Promise<void> {
    const { cmd, ...args } = JSON.parse(line.trim())
    this.emit('[WLAN] Log-Zeile, die ignoriert werden muss') // Rauschen
    const ss = (o: object): void => this.emit('@@SS ' + JSON.stringify(o))
    switch (cmd) {
      case 'hello':
        ss({ ok: true, cmd, info: { device: 'SpoolStation', fw: '0.9.0', api_version: 1, configured: this.configured, mac: 'AA:BB:CC:DD:EE:FF' } })
        break
      case 'scan_wifi':
        ss({ ok: true, cmd, networks: [ { ssid: 'Home', rssi: -50, enc: true }, { ssid: 'Gast', rssi: -72, enc: false } ] })
        break
      case 'set_wifi':
        if (this.wifiOk) { this.configured = true; ss({ ok: true, cmd, ip: '192.168.1.60', rssi: -51 }) }
        else ss({ ok: false, cmd, error: 'falsches Passwort?' })
        break
      case 'set_key': ss({ ok: true, cmd }); break
      case 'set_config': ss({ ok: true, cmd, changed: true, config: args }); break
      case 'get_info': ss({ ok: true, cmd, info: { configured: this.configured } }); break
      default: ss({ ok: false, cmd, error: 'unbekannt' })
    }
  }
}

describe('stationSerial – Parser', () => {
  it('encodeCommand baut eine JSON-Zeile', () => {
    expect(encodeCommand('set_wifi', { ssid: 'A', password: 'B' })).toBe('{"cmd":"set_wifi","ssid":"A","password":"B"}\n')
  })
  it('parseReply erkennt @@SS und ignoriert Logzeilen', () => {
    expect(parseReply('@@SS {"ok":true,"cmd":"hello"}')).toEqual({ ok: true, cmd: 'hello' })
    expect(parseReply('[WLAN] verbinde ...')).toBeNull()
    expect(parseReply('@@SS kaputt')).toBeNull()
  })
  it('splitLines sammelt unvollstaendige Zeilen im Rest', () => {
    const a = splitLines('', '@@SS {"a":1}\n[log] x')
    expect(a.lines).toEqual(['@@SS {"a":1}'])
    expect(a.rest).toBe('[log] x')
    const b = splitLines(a.rest, '\n@@SS {"b":2}\n')
    expect(b.lines).toEqual(['[log] x', '@@SS {"b":2}'])
    expect(b.rest).toBe('')
  })
  it('generateApiKey liefert 64 Hex-Zeichen', () => {
    const k = generateApiKey()
    expect(k).toMatch(/^[0-9a-f]{64}$/)
    expect(generateApiKey()).not.toBe(k)
  })
})

describe('stationSerial – Assistenten-Ablauf mit simulierter Station', () => {
  it('hello / scan_wifi / set_wifi(ok) / set_key / set_config', async () => {
    const fake = new FakeStation()
    const s = new StationSerial(fake)

    const hello = await s.hello()
    expect(hello.ok).toBe(true)
    expect((hello.info as { configured: boolean }).configured).toBe(false)

    const scan = await s.scanWifi()
    expect((scan.networks as unknown[]).length).toBe(2)

    const wifi = await s.setWifi('Home', 'geheim')
    expect(wifi.ok).toBe(true)
    expect(wifi.ip).toBe('192.168.1.60')

    const key = await s.setKey('a'.repeat(64))
    expect(key.ok).toBe(true)

    const cfg = await s.setConfig({ lang: 'de', spoolman_url: 'http://x:7912', printers: [] })
    expect(cfg.ok).toBe(true)
    expect((cfg.config as { lang: string }).lang).toBe('de')

    const info = await s.getInfo()
    expect((info.info as { configured: boolean }).configured).toBe(true)
    s.dispose()
  })

  it('set_wifi-Fehler wird gemeldet (falsches Passwort)', async () => {
    const fake = new FakeStation()
    fake.wifiOk = false
    const s = new StationSerial(fake)
    const wifi = await s.setWifi('Home', 'falsch')
    expect(wifi.ok).toBe(false)
    expect(wifi.error).toBe('falsches Passwort?')
    s.dispose()
  })
})
