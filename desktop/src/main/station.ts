import type {
  IpcResult,
  NfcJob,
  OpenSpool,
  PrinterSendResult,
  StationConfig,
  StationStatus,
  StationTarget
} from '../shared/types'

// Basis-URL aus einem Host (IP oder mDNS-Name) bauen.
function baseUrl(host: string): string {
  let h = host.trim()
  if (!h) return ''
  if (!/^https?:\/\//i.test(h)) h = 'http://' + h
  return h.replace(/\/+$/, '')
}

// Generischer HTTP-Aufruf mit API-Key-Header und Timeout.
async function call<T>(
  target: StationTarget,
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 5000
): Promise<IpcResult<T>> {
  const url = baseUrl(target.host) + path
  if (!baseUrl(target.host)) {
    return { ok: false, error: 'Keine Station-Adresse gesetzt' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'X-Api-Key': target.apiKey ?? '',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    const text = await res.text()
    let data: unknown = text
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      /* kein JSON – Rohtext behalten */
    }

    if (!res.ok) {
      const msg =
        (data && typeof data === 'object' && 'error' in data
          ? String((data as Record<string, unknown>).error)
          : '') || `HTTP ${res.status}`
      return { ok: false, status: res.status, error: msg, data: data as T }
    }
    return { ok: true, status: res.status, data: data as T }
  } catch (err) {
    const e = err as Error
    const msg =
      e.name === 'AbortError'
        ? 'Zeitueberschreitung – Station nicht erreichbar'
        : e.message || 'Netzwerkfehler'
    return { ok: false, error: msg }
  } finally {
    clearTimeout(timer)
  }
}

export function getStatus(t: StationTarget): Promise<IpcResult<StationStatus>> {
  return call<StationStatus>(t, 'GET', '/api/status', undefined, 4000)
}

export function getConfig(t: StationTarget): Promise<IpcResult<StationConfig>> {
  return call<StationConfig>(t, 'GET', '/api/config')
}

export function putConfig(
  t: StationTarget,
  config: Partial<StationConfig>
): Promise<IpcResult<StationConfig>> {
  return call<StationConfig>(t, 'PUT', '/api/config', config)
}

export function nfcRead(
  t: StationTarget,
  timeoutMs?: number
): Promise<IpcResult<{ job_id: number }>> {
  return call<{ job_id: number }>(t, 'POST', '/api/nfc/read', { timeout_ms: timeoutMs })
}

export function nfcWrite(
  t: StationTarget,
  openspool: OpenSpool,
  timeoutMs?: number
): Promise<IpcResult<{ job_id: number }>> {
  return call<{ job_id: number }>(t, 'POST', '/api/nfc/write', {
    openspool,
    timeout_ms: timeoutMs
  })
}

export function nfcJob(t: StationTarget): Promise<IpcResult<NfcJob>> {
  return call<NfcJob>(t, 'GET', '/api/nfc/job', undefined, 4000)
}

export function nfcCancel(t: StationTarget): Promise<IpcResult<{ ok: boolean }>> {
  return call<{ ok: boolean }>(t, 'POST', '/api/nfc/cancel')
}

export function printerSend(
  t: StationTarget,
  channel: number,
  openspool: OpenSpool,
  uid: string
): Promise<IpcResult<PrinterSendResult>> {
  return call<PrinterSendResult>(
    t,
    'POST',
    '/api/printer/send',
    { channel, openspool, uid },
    9000
  )
}
