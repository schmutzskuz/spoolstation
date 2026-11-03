import { Bonjour } from 'bonjour-service'
import type { DiscoveredStation } from '../shared/types'

// Sucht per mDNS nach Stationen (_spoolstation._tcp) und sammelt die
// Antworten fuer die angegebene Zeit.
export function discoverStations(timeoutMs = 3000): Promise<DiscoveredStation[]> {
  return new Promise((resolve) => {
    const found = new Map<string, DiscoveredStation>()
    let bonjour: Bonjour | null = null

    try {
      bonjour = new Bonjour()
    } catch {
      resolve([])
      return
    }

    const browser = bonjour.find({ type: 'spoolstation', protocol: 'tcp' })

    browser.on('up', (service) => {
      const ipv4 = (service.addresses || []).find((a) => a.includes('.') && !a.includes(':'))
      const host = ipv4 || (service.host ? service.host : '')
      if (!host) return
      found.set(host, {
        name: service.name || 'SpoolStation',
        host,
        port: service.port || 80
      })
    })

    const finish = (): void => {
      try {
        browser.stop()
      } catch {
        /* ignore */
      }
      try {
        bonjour?.destroy()
      } catch {
        /* ignore */
      }
      resolve(Array.from(found.values()))
    }

    setTimeout(finish, timeoutMs)
  })
}
