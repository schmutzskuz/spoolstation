import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import http from 'http'
import { createHash } from 'crypto'
import { writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Electron wird im Test nicht gebraucht -> minimal mocken, damit firmwareUpdate
// (und das von ihm importierte updateConfig) ohne echtes Electron ladbar ist.
vi.mock('electron', () => ({
  app: { isPackaged: false, getVersion: () => '0.9.0' },
  dialog: { showOpenDialog: vi.fn() },
  BrowserWindow: class {}
}))

import { compareVersions, parseManifest, decideStationUpdate } from '../src/shared/fwUpdate'
import { fwUpdate } from '../src/main/firmwareUpdate'
import type { FwProgress } from '../src/shared/types'

describe('compareVersions', () => {
  it('vergleicht Semver korrekt', () => {
    expect(compareVersions('1.0.0', '0.9.9')).toBe(1)
    expect(compareVersions('0.9.0', '0.10.0')).toBe(-1)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
    expect(compareVersions('v2.0.0', '1.9.9')).toBe(1) // fuehrendes v wird ignoriert
    expect(compareVersions('1.0.0-beta', '1.0.0')).toBe(0) // Vorab-Teil ignoriert
  })
})

describe('parseManifest', () => {
  const good = {
    device: 'SpoolStation',
    version: '0.9.0',
    api_version: 1,
    files: [
      { name: 'factory.bin', role: 'factory', size: 100, sha256: 'a'.repeat(64) },
      { name: 'ota.bin', role: 'ota', size: 1091152, sha256: 'b'.repeat(64) }
    ]
  }

  it('liest Version, api_version und den ota-Eintrag', () => {
    const m = parseManifest(good)
    expect(m).toEqual({ version: '0.9.0', api_version: 1, ota: { size: 1091152, sha256: 'b'.repeat(64) } })
  })

  it('verwirft fehlende/ungueltige Felder', () => {
    expect(parseManifest(null)).toBeNull()
    expect(parseManifest({ version: '0.9.0', api_version: 1, files: [] })).toBeNull() // kein ota
    expect(parseManifest({ version: 'x', api_version: 1, files: good.files })).toBeNull() // Version kaputt
    expect(parseManifest({ ...good, files: [{ role: 'ota', size: 10, sha256: 'xyz' }] })).toBeNull() // SHA kaputt
  })
})

describe('decideStationUpdate', () => {
  const latest = { version: '1.0.0', api_version: 1, ota: { size: 10, sha256: 'a'.repeat(64) } }
  const bundled = { version: '0.9.0', api_version: 1, ota: { size: 10, sha256: 'b'.repeat(64) } }

  it('bietet das Release an, wenn es neuer ist', () => {
    const d = decideStationUpdate({ stationVersion: '0.9.0', expectedApi: 1, latest, bundled })
    expect(d).toMatchObject({ available: true, from: '0.9.0', to: '1.0.0', source: 'latest' })
  })

  it('kein Update, wenn die Station bereits aktuell ist', () => {
    const d = decideStationUpdate({ stationVersion: '1.0.0', expectedApi: 1, latest, bundled })
    expect(d.available).toBe(false)
  })

  it('faellt auf die mitgelieferte Firmware zurueck (offline, kein Release)', () => {
    const d = decideStationUpdate({ stationVersion: '0.8.0', expectedApi: 1, latest: null, bundled })
    expect(d).toMatchObject({ available: true, to: '0.9.0', source: 'bundled' })
  })

  it('meldet api_version-Abweichung', () => {
    const d = decideStationUpdate({ stationVersion: '0.9.0', expectedApi: 2, latest, bundled })
    expect(d.apiMismatch).toBe(true)
  })
})

// --- OTA-Ablauf gegen eine simulierte Station -------------------------------

const sha256 = (b: Buffer): string => createHash('sha256').update(b).digest('hex')

interface FakeOpts {
  apiKey: string
  rejectStatus?: number // Station lehnt /api/ota mit diesem Status ab
  afterVersion: string // Version, die /api/status nach dem Update meldet
  lastOta: string // 'success' | 'rolled_back'
}

// Simulierte Station: /api/ota prueft Key + SHA-256 des Bodys, /api/status meldet
// nach dem Upload die neue Version (bzw. bei Rollback die alte + last_ota).
function makeStation(opts: FakeOpts): Promise<{ port: number; close: () => Promise<void> }> {
  let updated = false
  const server = http.createServer((req, res) => {
    const key = req.headers['x-api-key']
    if (req.method === 'POST' && req.url === '/api/ota') {
      if (key !== opts.apiKey) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'unauthorized' }))
        return
      }
      const chunks: Buffer[] = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        if (opts.rejectStatus) {
          res.writeHead(opts.rejectStatus, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'abgelehnt' }))
          return
        }
        const body = Buffer.concat(chunks)
        const headerSha = String(req.headers['x-fw-sha256'] || '')
        if (headerSha !== sha256(body)) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'SHA-256 stimmt nicht' }))
          return
        }
        updated = true
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, rebooting: true }))
      })
      return
    }
    if (req.method === 'GET' && req.url === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          name: 'Sim',
          version: updated ? opts.afterVersion : '0.9.0',
          api_version: 1,
          uptime_s: updated ? 5 : 9999,
          last_ota: updated ? opts.lastOta : ''
        })
      )
      return
    }
    res.writeHead(404)
    res.end()
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({
        port,
        close: () => new Promise<void>((r) => server.close(() => r()))
      })
    })
  })
}

const FAST = { initialDelayMs: 20, pollMs: 20, timeoutMs: 3000 }

describe('fwUpdate – OTA gegen simulierte Station', () => {
  let otaFile: string
  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), 'ss-ota-'))
    otaFile = join(dir, 'ota.bin')
    writeFileSync(otaFile, Buffer.from('FAKE-FIRMWARE-IMAGE-' + 'x'.repeat(2048)))
  })

  async function run(st: { port: number }, apiKey = 'key123'): Promise<FwProgress[]> {
    const events: FwProgress[] = []
    await fwUpdate(
      { host: `127.0.0.1:${st.port}`, apiKey, source: 'file', filePath: otaFile },
      'stable',
      (p) => events.push(p),
      FAST
    )
    return events
  }

  it('laedt hoch, SHA stimmt, Neustart -> Erfolg mit neuer Version', async () => {
    const st = await makeStation({ apiKey: 'key123', afterVersion: '1.0.0', lastOta: 'success' })
    const events = await run(st)
    await st.close()

    const last = events[events.length - 1]
    expect(last.phase).toBe('done')
    expect(last.result).toBe('success')
    expect(last.newVersion).toBe('1.0.0')
    // Upload-Fortschritt kam bis 100 %.
    expect(events.some((e) => e.phase === 'upload' && e.pct === 100)).toBe(true)
  })

  it('erkennt Rollback (alte Firmware laeuft weiter)', async () => {
    const st = await makeStation({ apiKey: 'key123', afterVersion: '0.9.0', lastOta: 'rolled_back' })
    const events = await run(st)
    await st.close()

    const last = events[events.length - 1]
    expect(last.phase).toBe('done')
    expect(last.result).toBe('rolled_back')
  })

  it('falscher API-Schluessel -> unauthorized', async () => {
    const st = await makeStation({ apiKey: 'key123', afterVersion: '1.0.0', lastOta: 'success' })
    const events = await run(st, 'falsch')
    await st.close()

    const last = events[events.length - 1]
    expect(last.phase).toBe('error')
    expect(last.message).toBe('unauthorized')
  })

  it('Station lehnt ab -> station-rejected', async () => {
    const st = await makeStation({ apiKey: 'key123', afterVersion: '1.0.0', lastOta: 'success', rejectStatus: 400 })
    const events = await run(st)
    await st.close()

    const last = events[events.length - 1]
    expect(last.phase).toBe('error')
    expect(last.message).toBe('station-rejected')
  })
})
