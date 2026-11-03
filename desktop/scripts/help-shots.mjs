// Erzeugt genau die Screenshots, die die In-App-Hilfe braucht, und legt sie
// nach src/renderer/src/help/images/ (nicht gitignored, werden mitgebaut).
//
//   npm run help:shots
//
// App-Seiten: ruft scripts/shot.mjs fuer die benoetigten Seiten auf und
// kopiert die Dark-Variante je Sprache (station-de.png usw.).
// Display: ruft scripts/shot-display.mjs auf und kopiert ausgewaehlte Szenen.
import { execSync } from 'child_process'
import { copyFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const desktopRoot = join(here, '..')
const projectRoot = join(desktopRoot, '..')
const imagesDir = join(desktopRoot, 'src', 'renderer', 'src', 'help', 'images')
await mkdir(imagesDir, { recursive: true })

const APP_PAGES = ['einstellungen', 'bibliothek', 'spool', 'drucker', 'station', 'filament']
const LANGS = ['de', 'en', 'es']
// Display-Szene -> Hilfe-Bildname (sprachneutral)
const DISPLAY = {
  'start-belegt': 'display-start',
  lesen: 'display-lesen',
  erfolg: 'display-erfolg',
  info: 'display-info'
}

console.log('App-Screenshots erzeugen …')
execSync(`node scripts/shot.mjs ${APP_PAGES.join(' ')}`, { cwd: desktopRoot, stdio: 'inherit' })

const appShots = join(desktopRoot, '.shots')
for (const name of APP_PAGES) {
  for (const lang of LANGS) {
    const src = join(appShots, `${name}-${lang}-dark.png`)
    const dst = join(imagesDir, `${name}-${lang}.png`)
    if (existsSync(src)) {
      await copyFile(src, dst)
      console.log('→', dst)
    } else {
      console.warn('! fehlt:', src)
    }
  }
}

console.log('Display-Screenshots erzeugen …')
execSync('node scripts/shot-display.mjs', { cwd: desktopRoot, stdio: 'inherit' })

const displayShots = join(projectRoot, 'firmware', 'preview', '.shots')
for (const [scene, outName] of Object.entries(DISPLAY)) {
  const src = join(displayShots, `${scene}.png`)
  const dst = join(imagesDir, `${outName}.png`)
  if (existsSync(src)) {
    await copyFile(src, dst)
    console.log('→', dst)
  } else {
    console.warn('! fehlt:', src)
  }
}

console.log('Fertig. Hilfe-Bilder unter', imagesDir)
