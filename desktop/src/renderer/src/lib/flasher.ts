// Flasht eine factory.bin per Web Serial mit esptool-js (keine nativen Module).
// Erwartet einen noch NICHT geoeffneten Web-Serial-Port; esptool-js oeffnet ihn
// selbst (und schliesst ihn am Ende wieder).
import { ESPLoader, Transport } from 'esptool-js'

export interface FlashProgress {
  pct: number // 0..100
  step: 'connect' | 'erase' | 'write' | 'done'
}

// Uint8Array -> Binaerstring (ein Zeichen pro Byte), wie esptool-js ihn erwartet.
function toBinaryString(bytes: Uint8Array): string {
  let out = ''
  const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) {
    out += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CH)))
  }
  return out
}

// port: Rueckgabe von requestStationPort() (NICHT geoeffnet).
export async function flashFactory(
  port: unknown,
  bytes: Uint8Array,
  opts: { erase: boolean; onProgress: (p: FlashProgress) => void }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transport = new Transport(port as any, false)
  const loader = new ESPLoader({
    transport,
    baudrate: 921600,
    romBaudrate: 115200,
    // Terminal wird nicht gebraucht – stilles no-op.
    terminal: { clean: () => {}, writeLine: () => {}, write: () => {} }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  try {
    opts.onProgress({ pct: 2, step: 'connect' })
    await loader.main()

    if (opts.erase) {
      opts.onProgress({ pct: 8, step: 'erase' })
      await loader.eraseFlash()
    }

    await loader.writeFlash({
      fileArray: [{ data: toBinaryString(bytes), address: 0 }],
      flashSize: 'keep',
      eraseAll: false,
      compress: true,
      reportProgress: (_i: number, written: number, total: number) => {
        opts.onProgress({ pct: 10 + Math.round((written / total) * 88), step: 'write' })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // Hard-Reset in den NORMALEN Start (nicht Bootloader): EN kurz low, IO0 high.
    // Ohne das bleibt der ESP32 nach dem Flashen im Bootloader haengen (schwarzes Display).
    try {
      await transport.setDTR(false) // IO0 high
      await transport.setRTS(true)  // EN low -> Reset
      await new Promise((r) => setTimeout(r, 150))
      await transport.setDTR(false)
      await transport.setRTS(false) // EN high -> Firmware startet
    } catch { /* ignore */ }

    opts.onProgress({ pct: 100, step: 'done' })
  } finally {
    // Transport sauber schliessen und Port vollstaendig freigeben
    // (disconnect wartet intern auf das Entsperren der Streams).
    try { await transport.disconnect() } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 400))
  }
}

// Firmware-Update per USB, OHNE Einstellungen zu verlieren: schreibt nur die
// App-Partition (ota.bin -> ota_0 bei 0x10000) und setzt die OTA-Auswahl zurueck
// (otadata bei 0xe000 mit 0xFF = leer -> Bootloader startet ota_0). Der NVS-Bereich
// (0x9000, WLAN/Schluessel/Config) bleibt unberuehrt.
export async function flashFirmwareKeepSettings(
  port: unknown,
  otaBytes: Uint8Array,
  opts: { onProgress: (p: FlashProgress) => void }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transport = new Transport(port as any, false)
  const loader = new ESPLoader({
    transport,
    baudrate: 921600,
    romBaudrate: 115200,
    terminal: { clean: () => {}, writeLine: () => {}, write: () => {} }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  try {
    opts.onProgress({ pct: 2, step: 'connect' })
    await loader.main()

    // otadata leeren (0xFF) -> Auswahl zuruecksetzen auf die erste App-Partition.
    const otadata = new Uint8Array(0x2000).fill(0xff)

    await loader.writeFlash({
      fileArray: [
        { data: toBinaryString(otaBytes), address: 0x10000 }, // App -> ota_0
        { data: toBinaryString(otadata), address: 0xe000 } // otadata -> leer
      ],
      flashSize: 'keep',
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex: number, written: number, total: number) => {
        // Nur die grosse App-Datei (Index 0) auf 10..98 % abbilden.
        if (fileIndex === 0) opts.onProgress({ pct: 10 + Math.round((written / total) * 88), step: 'write' })
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // Hard-Reset in den normalen Start (EN kurz low, IO0 high) – wie beim Flashen.
    try {
      await transport.setDTR(false)
      await transport.setRTS(true)
      await new Promise((r) => setTimeout(r, 150))
      await transport.setDTR(false)
      await transport.setRTS(false)
    } catch { /* ignore */ }

    opts.onProgress({ pct: 100, step: 'done' })
  } finally {
    try { await transport.disconnect() } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 400))
  }
}
