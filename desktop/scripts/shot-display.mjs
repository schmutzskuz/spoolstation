// Rendert die Firmware-Display-Vorschau (firmware/preview/display.html) fuer alle
// Zustaende als PNG – zur Design-Begutachtung, bevor geflasht wird.
// Aufruf (aus desktop/):  node scripts/shot-display.mjs
import { mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const htmlPath = join(here, '..', '..', 'firmware', 'preview', 'display.html')
const outDir = join(here, '..', '..', 'firmware', 'preview', '.shots')
await mkdir(outDir, { recursive: true })
const htmlUrl = pathToFileURL(htmlPath).href

// Beispiel-Slots (entsprechen der Erwartung: 1 weiss, 2 schwarz/PETG, 3 braun, 4 schwarz)
const SLOTS = [
  { color: '#F2F2F2', name: 'Generic PLA', material: 'PLA', remaining: 820 },
  { color: '#141414', name: 'Creality PETG', material: 'PETG', remaining: 500 },
  { color: '#6F4C2F', name: 'PolyTerra Brown', material: 'PLA', remaining: 120 },
  { color: '#141414', name: 'Elegoo PLA', material: 'PLA', remaining: 1000 }
]
const EMPTY = [{}, {}, {}, {}]

const scenes = [
  ['start-belegt',  'home',    { slots: SLOTS, sel: 1, title: 'Slot 2' }],
  ['start-leer',    'home',    { slots: EMPTY, sel: 0, title: 'Slot 1' }],
  ['drehen',        'home',    { slots: SLOTS, sel: 2, selAnim: 1.45, title: 'Slot 3' }],
  ['kein-wlan',     'home',    { slots: SLOTS, sel: 0, title: 'Slot 1', problem: 'wifi' }],
  ['drucker-weg',   'home',    { slots: SLOTS, sel: 1, title: 'Slot 2', problem: 'printer' }],
  ['lesen',         'reading', { frac: 0.62, rest: 6, phase: 0.35 }],
  ['erfolg',        'result',  { ok: true, color: '#7A3FA0', l1: 'Slot 2 geladen', l2: 'Creality PLA Purple', check: 1, grow: 1, fill: 0.7 }],
  ['fehler',        'result',  { ok: false, l1: 'Drucker-Fehler', l2: 'nicht erreichbar', shake: 0.3 }],
  ['pc-auftrag',    'pc',      { phase: 0.35 }],
  ['pc-schreiben',  'result',  { ok: true, color: '#7A3FA0', l1: 'Tag geschrieben', l2: 'Creality PLA Purple', check: 1, grow: 1, fill: 0.7 }],
  ['pc-lesen',      'result',  { ok: true, color: '#1E90FF', l1: 'Tag gelesen', l2: 'Generic PLA Blau', check: 1, grow: 1, fill: 0.7 }],
  ['info',          'info',    {}],
  ['einrichtung',   'setup',   {}],
  ['werksreset',    'reset',   { held: 0.6 }],
  ['gedimmt',       'home',    { slots: SLOTS, sel: 1, title: 'Slot 2' }, true]
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 240, height: 240 }, deviceScaleFactor: 3 })
try {
  for (const [name, scene, data, dim] of scenes) {
    const url = `${htmlUrl}?scene=${scene}&data=${encodeURIComponent(JSON.stringify(data))}${dim ? '&dim=1' : ''}`
    await page.goto(url)
    await page.waitForFunction('window.__done === true')
    await page.waitForTimeout(80)
    const el = await page.$('#c')
    const file = join(outDir, `${name}.png`)
    await el.screenshot({ path: file })
    console.log('→', file)
  }
} finally {
  await browser.close()
}
console.log('Fertig. PNGs unter', outDir)
