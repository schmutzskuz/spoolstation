import { app } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'

// Einzige Stelle fuer die Update-Quelle: update.config.json im Hauptordner des
// Projekts. Im Entwicklungsbetrieb liegt sie neben dem Repo, im Installer wird
// sie als Ressource mitgeliefert (electron-builder extraResources).
export interface UpdateSource {
  owner: string
  repo: string
  configured: boolean
}

function configPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'update.config.json')
    : join(__dirname, '../../../update.config.json')
}

let cached: UpdateSource | null = null

export function loadUpdateSource(): UpdateSource {
  if (cached) return cached
  try {
    const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as { owner?: string; repo?: string }
    const owner = (raw.owner || '').trim()
    const repo = (raw.repo || '').trim()
    cached = { owner, repo, configured: !!(owner && repo) }
  } catch {
    // Datei fehlt oder kaputt -> Updates deaktiviert (unauffaellig).
    cached = { owner: '', repo: '', configured: false }
  }
  return cached
}
