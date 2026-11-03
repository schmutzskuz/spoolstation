// Web-Serial-Adapter: oeffnet den USB-Port der Station und stellt ein LineIO
// fuer das Einrichtungsprotokoll bereit. Der rohe Port wird zusaetzlich zurueck-
// gegeben, damit das Flashen (esptool-js) denselben Port nutzen kann.
import { splitLines, type LineIO } from './stationSerial'

// Minimaltypen fuer die Web Serial API (nicht in lib.dom enthalten).
interface SerialPortLike {
  open(opts: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  setSignals?(opts: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// Setzt die Steuerleitungen so, dass der ESP32 normal laeuft (weder Reset noch
// Bootloader): DTR=false (IO0 high), RTS=false (EN high). Fuer CH340/CP210x ist
// wichtig, nach dem Oeffnen BEIDE zu deasserten, sonst haengt der Chip im Reset.
async function signalsRun(port: SerialPortLike): Promise<void> {
  try { await port.setSignals?.({ dataTerminalReady: false, requestToSend: false }) } catch { /* ignore */ }
}
// Normaler Neustart (EN kurz low): startet die laufende/geflashte Firmware frisch,
// damit wir ihre Boot-Meldung ("@@SS ready") sehen.
async function pulseReset(port: SerialPortLike): Promise<void> {
  try {
    await port.setSignals?.({ dataTerminalReady: false, requestToSend: true }) // EN low
    await sleep(120)
    await port.setSignals?.({ dataTerminalReady: false, requestToSend: false }) // EN high -> run
  } catch { /* ignore */ }
}
interface SerialLike {
  requestPort(opts?: { filters?: { usbVendorId: number }[] }): Promise<SerialPortLike>
  getPorts(): Promise<SerialPortLike[]>
}

// Bekannte USB-Serial-Bruecken: CH340, CP210x, FTDI, ESP32-S3 (nativ).
export const USB_FILTERS = [
  { usbVendorId: 0x1a86 },
  { usbVendorId: 0x10c4 },
  { usbVendorId: 0x0403 },
  { usbVendorId: 0x303a }
]

export function serialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

function serial(): SerialLike {
  return (navigator as unknown as { serial: SerialLike }).serial
}

export interface StationPort {
  io: LineIO
  port: SerialPortLike
  close: () => Promise<void>
}

// Fragt den Nutzer nach dem Port (muss aus einem Klick kommen) und oeffnet ihn.
export async function requestStationPort(): Promise<SerialPortLike> {
  return serial().requestPort({ filters: USB_FILTERS })
}

// Oeffnet einen (bereits gewaehlten) Port mit 115200 und baut das LineIO auf.
// resetToRun pulst nach dem Oeffnen EN (Neustart), damit die Firmware frisch
// startet und ihre Boot-Meldung sendet – noetig nach dem Flashen.
export async function openStationPort(port: SerialPortLike, resetToRun = true): Promise<StationPort> {
  await port.open({ baudRate: 115200 })
  await signalsRun(port)

  const listeners = new Set<(l: string) => void>()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  let reading = true
  const reader = port.readable!.getReader()
  const writer = port.writable!.getWriter()
  ;(async () => {
    try {
      while (reading) {
        const { value, done } = await reader.read()
        if (done) break
        if (!value) continue
        const r = splitLines(buffer, decoder.decode(value, { stream: true }))
        buffer = r.rest
        for (const line of r.lines) {
          // Rohe Stationsantworten zum Debuggen mitloggen.
          if (line.startsWith('@@SS')) {
            // eslint-disable-next-line no-console
            console.log('[serial<<]', line)
          }
          for (const cb of [...listeners]) cb(line)
        }
      }
    } catch {
      /* Port geschlossen / "invalid data pipe read" – ignorieren */
    }
  })()

  // Reader laeuft jetzt -> Neustart ausloesen, damit wir "@@SS ready" sehen.
  if (resetToRun) await pulseReset(port)

  const io: LineIO = {
    write: async (line) => { await writer.write(encoder.encode(line)) },
    onLine: (cb) => { listeners.add(cb); return () => listeners.delete(cb) }
  }
  const close = async (): Promise<void> => {
    reading = false
    try { await reader.cancel() } catch { /* ignore */ }
    try { reader.releaseLock() } catch { /* ignore */ }
    try { writer.releaseLock() } catch { /* ignore */ }
    try { await port.close() } catch { /* ignore */ }
  }
  return { io, port, close }
}
