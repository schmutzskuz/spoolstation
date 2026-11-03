// Client fuer das USB-Serial-Einrichtungsprotokoll der Station.
// Befehle gehen als JSON-Zeilen raus, Antworten der Station sind mit "@@SS "
// praefixiert (alles andere sind Log-Zeilen und wird ignoriert).
//
// Die Klasse arbeitet gegen ein abstraktes LineIO, damit sie mit Web Serial
// (echte Station) genauso wie mit einer simulierten Station (Tests) laeuft.

export const SS_PREFIX = '@@SS '

export interface LineIO {
  write(line: string): Promise<void> // sendet genau eine Zeile (inkl. \n)
  onLine(cb: (line: string) => void): () => void // liefert komplette Zeilen
}

// Baut eine Befehlszeile (JSON + Zeilenumbruch).
export function encodeCommand(cmd: string, args: Record<string, unknown> = {}): string {
  return JSON.stringify({ cmd, ...args }) + '\n'
}

// Parst eine @@SS-Antwortzeile; Nicht-@@SS-Zeilen -> null (Log).
export function parseReply(line: string): Record<string, unknown> | null {
  const t = line.replace(/\r$/, '')
  if (!t.startsWith(SS_PREFIX)) return null
  try {
    const v = JSON.parse(t.slice(SS_PREFIX.length))
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// Zerlegt einen rohen Chunk in vollstaendige Zeilen; der Rest (ohne \n) bleibt
// im Puffer und wird beim naechsten Chunk vorangestellt.
export function splitLines(buffer: string, chunk: string): { lines: string[]; rest: string } {
  const data = buffer + chunk
  const parts = data.split('\n')
  const rest = parts.pop() ?? ''
  return { lines: parts, rest }
}

interface Waiter {
  cmd: string
  resolve: (v: Record<string, unknown>) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class StationSerial {
  private waiters: Waiter[] = []
  private unsub: () => void

  constructor(private io: LineIO) {
    this.unsub = io.onLine((l) => this.handleLine(l))
  }

  dispose(): void {
    this.unsub()
    for (const w of this.waiters) { clearTimeout(w.timer); w.reject(new Error('geschlossen')) }
    this.waiters = []
  }

  private handleLine(line: string): void {
    const reply = parseReply(line)
    if (!reply) return
    const cmd = String(reply.cmd ?? '')
    const idx = this.waiters.findIndex((w) => w.cmd === cmd)
    const w = idx >= 0 ? this.waiters.splice(idx, 1)[0] : this.waiters.shift()
    if (!w) return
    clearTimeout(w.timer)
    w.resolve(reply)
  }

  // Sendet einen Befehl und wartet auf die passende @@SS-Antwort.
  request(cmd: string, args: Record<string, unknown> = {}, timeoutMs = 20000): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = this.waiters.findIndex((x) => x.timer === timer)
        if (i >= 0) this.waiters.splice(i, 1)
        reject(new Error(`Zeitüberschreitung bei "${cmd}"`))
      }, timeoutMs)
      this.waiters.push({ cmd, resolve, reject, timer })
      this.io.write(encodeCommand(cmd, args)).catch((e) => {
        clearTimeout(timer)
        const i = this.waiters.findIndex((x) => x.timer === timer)
        if (i >= 0) this.waiters.splice(i, 1)
        reject(e as Error)
      })
    })
  }

  // Bequeme Wrapper -------------------------------------------------------
  hello(): Promise<Record<string, unknown>> { return this.request('hello', {}, 5000) }
  scanWifi(): Promise<Record<string, unknown>> { return this.request('scan_wifi', {}, 20000) }
  setWifi(ssid: string, password: string): Promise<Record<string, unknown>> {
    return this.request('set_wifi', { ssid, password }, 25000)
  }
  setKey(key: string): Promise<Record<string, unknown>> { return this.request('set_key', { key }) }
  setConfig(cfg: Record<string, unknown>): Promise<Record<string, unknown>> { return this.request('set_config', cfg) }
  getInfo(): Promise<Record<string, unknown>> { return this.request('get_info', {}, 5000) }
  // reboot/factory_reset antworten noch kurz, dann startet die Station neu.
  reboot(): Promise<void> { return this.io.write(encodeCommand('reboot')) }
  factoryReset(): Promise<void> { return this.io.write(encodeCommand('factory_reset')) }
}

// Wartet nach einem Reset auf die Station: entweder auf die Boot-Zeile
// ("@@SS {ready:true}") oder – als Fallback – auf eine erfolgreiche hello-Antwort
// (mehrere Versuche). Wirft, wenn die Station gar nicht antwortet.
export async function waitForStation(io: LineIO, ss: StationSerial, tries = 8): Promise<void> {
  let settled = false
  const ready = new Promise<void>((resolve) => {
    const un = io.onLine((l) => {
      const r = parseReply(l)
      if (r && r.ready === true) { un(); if (!settled) { settled = true; resolve() } }
    })
  })
  const helloLoop = (async () => {
    for (let i = 0; i < tries; i++) {
      if (settled) return
      try { await ss.request('hello', {}, 2500); return } catch { /* naechster Versuch */ }
    }
    throw new Error('keine Antwort')
  })()
  helloLoop.catch(() => {})
  await Promise.race([ready, helloLoop.then(() => { settled = true })])
  settled = true
}

// Erzeugt einen zufaelligen API-Schluessel (32 Byte -> 64 Hex-Zeichen).
export function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
