// Screenshots der Entwickler-Vorschau (#/preview/<seite>) in de/en/es x dark/light.
// Baut den Renderer, serviert ihn statisch und nimmt per Playwright PNGs auf.
// Aufruf: npm run shot  (optional: npm run shot -- station bibliothek  -> nur diese Seiten)
import http from 'http'
import { readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { chromium } from '@playwright/test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'out', 'renderer')

if (!existsSync(join(dist, 'index.html'))) {
  console.log('Renderer-Build fehlt – baue …')
  execSync('npx electron-vite build', { cwd: root, stdio: 'inherit' })
}

const shotsDir = join(root, '.shots')
await mkdir(shotsDir, { recursive: true })

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json'
}

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0])
  if (p === '/' || !extname(p)) p = '/index.html'
  try {
    const data = await readFile(join(dist, p))
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('404')
  }
})

const PORT = 4599
await new Promise((r) => server.listen(PORT, r))
const base = `http://127.0.0.1:${PORT}`

// name = Dateiname/Filter, route = Preview-Seite, query = zusaetzliche Parameter.
const ALL_PAGES = [
  { name: 'graphic', route: 'graphic' },
  { name: 'drucker', route: 'drucker' },
  { name: 'drucker-einzel', route: 'drucker', query: 'printers=1' },
  { name: 'drucker-leer', route: 'drucker', query: 'printers=0' },
  { name: 'station', route: 'station' },
  { name: 'bibliothek', route: 'bibliothek' },
  { name: 'filament', route: 'filament' },
  { name: 'spool', route: 'spool' },
  { name: 'spool-1080', route: 'spool', width: 1080 },
  { name: 'spool-1400', route: 'spool', width: 1400 },
  { name: 'vendor', route: 'vendor' },
  { name: 'einstellungen', route: 'einstellungen' }
]
const argPages = process.argv.slice(2)
const pages = argPages.length > 0 ? ALL_PAGES.filter((p) => argPages.includes(p.name)) : ALL_PAGES
const langs = ['de', 'en', 'es']

const browser = await chromium.launch()
try {
  for (const { name, route, query, width } of pages) {
    for (const lang of langs) {
      for (const theme of ['dark', 'light']) {
        // Hoher Viewport: die Seiten scrollen in einem h-full-Container, daher muss die
        // Fensterhoehe reichen, damit fullPage den kompletten Inhalt erfasst.
        const page = await browser.newPage({ viewport: { width: width || 1320, height: 1500 } })
        const q = `theme=${theme}&lang=${lang}${query ? '&' + query : ''}`
        await page.goto(`${base}/#/preview/${route}?${q}`, { waitUntil: 'networkidle' })
        // Kurz warten, bis Daten (Mock) geladen und gerendert sind.
        await page.waitForTimeout(800)
        const file = join(shotsDir, `${name}-${lang}-${theme}.png`)
        await page.screenshot({ path: file, fullPage: true })
        await page.close()
        console.log('→', file)
      }
    }
  }
} finally {
  await browser.close()
  server.close()
}
console.log('Fertig. PNGs unter', shotsDir)
