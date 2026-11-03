// Gemeinsamer Versions-Bump fuer App und Firmware.
//
//   npm run version:bump -- patch | minor | major | sync
//
// version.json im Hauptordner ist die EINZIGE Quelle der Wahrheit:
//   { "version": "x.y.z", "api_version": <n> }
// Das Skript erhoeht die Semver-Version (ausser bei "sync") und schreibt sie,
// zusammen mit api_version, an alle abhaengigen Stellen:
//   - firmware/include/version.h   (FW_VERSION, FW_API_VERSION)
//   - desktop/package.json         ("version")
//   - package.json                 ("version", Hauptordner)
//   - desktop/src/shared/version.ts (APP_VERSION, STATION_API_VERSION)
// und legt ein CHANGELOG-Geruest fuer die neue Version an.
//
// api_version wird NICHT automatisch erhoeht (das ist eine bewusste,
// strukturelle Aenderung): dafuer api_version in version.json von Hand
// anpassen und anschliessend "npm run version:bump -- sync" ausfuehren.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const mode = (process.argv[2] || '').toLowerCase()
if (!['patch', 'minor', 'major', 'sync'].includes(mode)) {
  console.error('Verwendung: npm run version:bump -- patch | minor | major | sync')
  process.exit(1)
}

const versionPath = join(root, 'version.json')
const src = JSON.parse(readFileSync(versionPath, 'utf8'))

const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(src.version || '0.0.0'))
if (!m) {
  console.error(`version.json: ungueltige Version "${src.version}" (erwartet x.y.z)`)
  process.exit(1)
}
let [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])]
if (mode === 'major') { major++; minor = 0; patch = 0 }
else if (mode === 'minor') { minor++; patch = 0 }
else if (mode === 'patch') { patch++ }

const version = `${major}.${minor}.${patch}`
const apiVersion = Number(src.api_version ?? 1)

// --- version.json ---
writeFileSync(versionPath, JSON.stringify({ version, api_version: apiVersion }, null, 2) + '\n')

// --- firmware/include/version.h ---
const versionH = join(root, 'firmware', 'include', 'version.h')
writeFileSync(
  versionH,
  `#pragma once

// AUTO-GENERIERT von scripts/version-bump.mjs aus version.json – nicht von Hand aendern.
// Gemeinsame Version von App und Firmware; FW_API_VERSION = Version der HTTP-API (/api/*).
#define FW_VERSION "${version}"
#define FW_API_VERSION ${apiVersion}
`
)

// --- desktop/package.json + package.json (Hauptordner) ---
for (const pkgPath of [join(root, 'desktop', 'package.json'), join(root, 'package.json')]) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  pkg.version = version
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

// --- desktop/src/shared/version.ts ---
const sharedVersion = join(root, 'desktop', 'src', 'shared', 'version.ts')
writeFileSync(
  sharedVersion,
  `// AUTO-GENERIERT von scripts/version-bump.mjs aus version.json – nicht von Hand aendern.
export const APP_VERSION = '${version}'
// Version der Station-HTTP-API, die diese App-Version erwartet. Weicht die von der
// Station gemeldete api_version ab, zeigt die App einen Kompatibilitaetshinweis.
export const STATION_API_VERSION = ${apiVersion}
`
)

// --- CHANGELOG-Geruest ---
const changelogPath = join(root, 'CHANGELOG.md')
const today = new Date().toISOString().slice(0, 10)
const header = '# Changelog\n\nAlle nennenswerten Aenderungen an SpoolStation (App + Firmware).\n'
const entry = `\n## ${version} – ${today}\n\n- _Noch auszufuellen._\n`
if (existsSync(changelogPath)) {
  const existing = readFileSync(changelogPath, 'utf8')
  if (existing.includes(`## ${version} `)) {
    console.log(`CHANGELOG: Eintrag fuer ${version} existiert bereits – nicht veraendert.`)
  } else {
    // Neuen Eintrag direkt unter die Kopfzeile einfuegen.
    const idx = existing.indexOf('\n## ')
    const out = idx >= 0
      ? existing.slice(0, idx) + entry + existing.slice(idx)
      : existing.trimEnd() + '\n' + entry
    writeFileSync(changelogPath, out)
  }
} else {
  writeFileSync(changelogPath, header + entry)
}

console.log(`Version gesetzt: ${version} (api_version ${apiVersion}, Modus: ${mode})`)
console.log('Aktualisiert: version.json, firmware/include/version.h, desktop/package.json, package.json, desktop/src/shared/version.ts, CHANGELOG.md')
