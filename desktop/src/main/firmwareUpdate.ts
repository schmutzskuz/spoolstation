import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { createHash } from 'crypto'
import http from 'http'
import { loadUpdateSource } from './updateConfig'
import { compareVersions, parseManifest } from '../shared/fwUpdate'
import type { FwInfo, FwProgress, FwUpdateOptions, StationStatus } from '../shared/types'

// Ordner mit der mitgelieferten Firmware (ota.bin, factory.bin, Manifest).
function resDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'firmware')
    : join(__dirname, '../../resources/firmware')
}

function sha256(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex')
}

function friendlyError(e: unknown): string {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase()
  if (/enotfound|getaddrinfo|econnrefused|econnreset|etimedout|network|fetch failed|net::/.test(m)) return 'offline'
  if (/rate limit|403/.test(m)) return 'rate-limit'
  if (/404|no release|not found/.test(m)) return 'no-release'
  if (/sha|checksum|integrity|hash/.test(m)) return 'corrupt'
  return 'generic'
}

function cleanNotes(body: unknown): string | undefined {
  if (typeof body !== 'string') return undefined
  return body.replace(/\r/g, '').trim() || undefined
}

const GH_HEADERS = { 'User-Agent': 'SpoolStation', Accept: 'application/vnd.github+json' }

interface GhAsset { name: string; browser_download_url: string; size: number }
interface GhRelease { tag_name: string; body?: string; draft: boolean; prerelease: boolean; assets: GhAsset[] }

// Neuestes passendes Release holen (bei Beta auch Pre-Releases).
async function fetchLatestRelease(owner: string, repo: string, channel: 'stable' | 'beta'): Promise<GhRelease> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=20`, {
    headers: GH_HEADERS
  })
  if (res.status === 404) throw new Error('404 no release')
  if (res.status === 403) throw new Error('rate limit 403')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const list = (await res.json()) as GhRelease[]
  const rels = (Array.isArray(list) ? list : []).filter(
    (r) => !r.draft && (channel === 'beta' ? true : !r.prerelease)
  )
  rels.sort((a, b) => compareVersions(b.tag_name, a.tag_name))
  if (rels.length === 0) throw new Error('404 no release')
  return rels[0]
}

// Mitgelieferte Firmware einlesen.
async function readBundled(): Promise<{ version?: string; api_version?: number; size: number; sha256: string } | null> {
  try {
    const mj = JSON.parse(await readFile(join(resDir(), 'firmware-manifest.json'), 'utf8'))
    const m = parseManifest(mj)
    if (!m) return null
    return { version: m.version, api_version: m.api_version, size: m.ota.size, sha256: m.ota.sha256 }
  } catch {
    return null
  }
}

export async function fwInfo(channel: 'stable' | 'beta', expectedApi: number): Promise<FwInfo> {
  const src = loadUpdateSource()
  const bundled = await readBundled()
  const info: FwInfo = {
    configured: src.configured,
    expectedApi,
    bundled: bundled ? { version: bundled.version!, api_version: bundled.api_version!, size: bundled.size, sha256: bundled.sha256 } : null,
    latest: null
  }
  if (!src.configured) return info

  try {
    const rel = await fetchLatestRelease(src.owner, src.repo, channel)
    const manAsset = rel.assets.find((a) => a.name === 'firmware-manifest.json')
    const otaAsset = rel.assets.find((a) => a.name === 'ota.bin')
    if (!manAsset || !otaAsset) {
      info.error = 'no-release'
      return info
    }
    const mres = await fetch(manAsset.browser_download_url, { headers: GH_HEADERS })
    if (!mres.ok) throw new Error(`HTTP ${mres.status}`)
    const m = parseManifest(await mres.json())
    if (!m) {
      info.error = 'no-release'
      return info
    }
    info.latest = {
      version: m.version,
      api_version: m.api_version,
      size: m.ota.size,
      sha256: m.ota.sha256,
      notes: cleanNotes(rel.body),
      downloadUrl: otaAsset.browser_download_url
    }
  } catch (e) {
    info.error = friendlyError(e)
  }
  return info
}

export async function pickOtaFile(parent: BrowserWindow | null): Promise<string | null> {
  const options = {
    title: 'Firmware-Datei (ota.bin) auswählen',
    filters: [{ name: 'Firmware', extensions: ['bin'] }],
    properties: ['openFile' as const]
  }
  const res = parent
    ? await dialog.showOpenDialog(parent, options)
    : await dialog.showOpenDialog(options)
  if (res.canceled || res.filePaths.length === 0) return null
  return res.filePaths[0]
}

// Host (IP oder mDNS, evtl. mit http://) in {hostname, port} zerlegen (Port 80).
function parseHost(host: string): { hostname: string; port: number } {
  let h = host.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  let port = 80
  const idx = h.lastIndexOf(':')
  if (idx > 0 && /^\d+$/.test(h.slice(idx + 1))) {
    port = Number(h.slice(idx + 1))
    h = h.slice(0, idx)
  }
  return { hostname: h, port }
}

// ota.bin per HTTP-POST an /api/ota streamen, mit echtem Upload-Fortschritt.
function uploadOta(
  host: string,
  apiKey: string,
  body: Buffer,
  sha: string,
  onPct: (pct: number) => void
): Promise<{ ok: boolean; status: number; errorCode?: string; message?: string }> {
  return new Promise((resolve) => {
    const { hostname, port } = parseHost(host)
    const req = http.request(
      {
        hostname,
        port,
        path: '/api/ota',
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': body.length,
          'X-Api-Key': apiKey,
          'X-FW-SHA256': sha
        },
        timeout: 120000
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, status: res.statusCode })
          } else {
            let msg = ''
            try {
              msg = String(JSON.parse(data).error || '')
            } catch {
              /* Rohtext */
            }
            resolve({
              ok: false,
              status: res.statusCode || 0,
              errorCode:
                res.statusCode === 401
                  ? 'unauthorized'
                  : res.statusCode === 404
                    ? 'no-ota-endpoint' // alte Firmware ohne OTA-Endpunkt
                    : 'station-rejected',
              message: msg
            })
          }
        })
      }
    )

    req.on('error', () => resolve({ ok: false, status: 0, errorCode: 'offline' }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false, status: 0, errorCode: 'offline' })
    })

    // In Haeppchen schreiben, damit der Fortschritt mitlaeuft (TCP-Flusskontrolle
    // bremst uns genau dann, wenn der ESP32 gerade ins Flash schreibt).
    const CHUNK = 16 * 1024
    let offset = 0
    const writeMore = (): void => {
      let ok = true
      while (offset < body.length && ok) {
        const end = Math.min(offset + CHUNK, body.length)
        const slice = body.subarray(offset, end)
        offset = end
        onPct(Math.round((offset / body.length) * 100))
        ok = req.write(slice)
      }
      if (offset < body.length) {
        req.once('drain', writeMore)
      } else {
        req.end()
      }
    }
    writeMore()
  })
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// Zeitsteuerung des Reboot-Wartens (fuer Tests ueberschreibbar).
export interface OtaTiming {
  initialDelayMs: number
  pollMs: number
  timeoutMs: number
}
const DEFAULT_TIMING: OtaTiming = { initialDelayMs: 4000, pollMs: 1500, timeoutMs: 60000 }

// Nach dem Upload auf den Neustart warten und die neue Version bestaetigen.
async function waitForStation(
  host: string,
  apiKey: string,
  targetVersion: string | undefined,
  timing: OtaTiming
): Promise<{ reachable: boolean; version?: string; result?: 'success' | 'rolled_back' }> {
  const base = 'http://' + host.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
  const deadline = Date.now() + timing.timeoutMs
  await sleep(timing.initialDelayMs) // der Station Zeit zum Rebooten geben (alte FW antwortet sonst noch)
  while (Date.now() < deadline) {
    try {
      const ctl = new AbortController()
      const tm = setTimeout(() => ctl.abort(), 3000)
      const res = await fetch(base + '/api/status', { headers: { 'X-Api-Key': apiKey }, signal: ctl.signal })
      clearTimeout(tm)
      if (res.ok) {
        const st = (await res.json()) as StationStatus
        const freshlyBooted = (st.uptime_s ?? 999) < 30
        const matches = targetVersion ? st.version === targetVersion : false
        // Die alte FW koennte kurz noch antworten -> nur akzeptieren, wenn sie
        // frisch gebootet ist, die Zielversion meldet oder ein OTA-Ergebnis setzt.
        if (freshlyBooted || matches || (st.last_ota && st.last_ota !== '')) {
          return {
            reachable: true,
            version: st.version,
            result: st.last_ota === 'rolled_back' ? 'rolled_back' : 'success'
          }
        }
      }
    } catch {
      /* noch nicht erreichbar -> weiter warten */
    }
    await sleep(timing.pollMs)
  }
  return { reachable: false }
}

export async function fwUpdate(
  opts: FwUpdateOptions & { downloadUrl?: string; sha256?: string; version?: string },
  channel: 'stable' | 'beta',
  onProgress: (p: FwProgress) => void,
  timing: Partial<OtaTiming> = {}
): Promise<void> {
  const tm: OtaTiming = { ...DEFAULT_TIMING, ...timing }
  const emit = (p: Partial<FwProgress> & { phase: FwProgress['phase'] }): void =>
    onProgress({ pct: 0, ...p })

  try {
    emit({ phase: 'prepare', pct: 0 })

    let bytes: Buffer
    let sha: string
    let targetVersion: string | undefined

    if (opts.source === 'bundled') {
      bytes = await readFile(join(resDir(), 'ota.bin'))
      const b = await readBundled()
      sha = b?.sha256 ?? sha256(bytes)
      targetVersion = b?.version
      if (sha256(bytes) !== sha) {
        emit({ phase: 'error', pct: 0, message: 'corrupt' })
        return
      }
    } else if (opts.source === 'file') {
      if (!opts.filePath) {
        emit({ phase: 'error', pct: 0, message: 'generic' })
        return
      }
      bytes = await readFile(opts.filePath)
      sha = sha256(bytes) // eigene Datei: kein Manifest -> SHA selbst bilden
    } else {
      // latest: ota.bin aus dem Release laden (URL/SHA kommen aus fw:info)
      let url = opts.downloadUrl
      let expectSha = opts.sha256
      targetVersion = opts.version
      if (!url || !expectSha) {
        const info = await fwInfo(channel, 0)
        if (!info.latest?.downloadUrl) {
          emit({ phase: 'error', pct: 0, message: info.error || 'no-release' })
          return
        }
        url = info.latest.downloadUrl
        expectSha = info.latest.sha256
        targetVersion = info.latest.version
      }
      const dl = await fetch(url, { headers: GH_HEADERS })
      if (!dl.ok) {
        emit({ phase: 'error', pct: 0, message: friendlyError(new Error('HTTP ' + dl.status)) })
        return
      }
      bytes = Buffer.from(await dl.arrayBuffer())
      sha = expectSha
      if (sha256(bytes) !== sha) {
        emit({ phase: 'error', pct: 0, message: 'corrupt' })
        return
      }
    }

    emit({ phase: 'upload', pct: 0 })
    const up = await uploadOta(opts.host, opts.apiKey, bytes, sha, (pct) => emit({ phase: 'upload', pct }))
    if (!up.ok) {
      emit({ phase: 'error', pct: 0, message: up.errorCode || 'generic' })
      return
    }

    emit({ phase: 'reboot', pct: 0 })
    const verify = await waitForStation(opts.host, opts.apiKey, targetVersion, tm)
    if (!verify.reachable) {
      emit({ phase: 'error', pct: 100, message: 'no-reboot' })
      return
    }
    emit({ phase: 'done', pct: 100, result: verify.result, newVersion: verify.version })
  } catch (e) {
    emit({ phase: 'error', pct: 0, message: friendlyError(e) })
  }
}
