import {
  Rocket,
  Radio,
  Layers,
  Tag,
  ScanLine,
  Library,
  Printer,
  Download,
  Cpu,
  LifeBuoy
} from 'lucide-react'
import type { PageId } from '@/components/Sidebar'

export type HelpLang = 'de' | 'en' | 'es'

export interface HelpChapterMeta {
  id: string
  icon: typeof Radio
}

// Reihenfolge der Kapitel in der Hilfe. Die Titel stehen als erste
// Ueberschrift (# …) in der jeweiligen Markdown-Datei und sind so
// automatisch uebersetzt.
export const HELP_CHAPTERS: HelpChapterMeta[] = [
  { id: 'getting-started', icon: Rocket },
  { id: 'device', icon: Radio },
  { id: 'filament', icon: Layers },
  { id: 'write-tag', icon: Tag },
  { id: 'read-send', icon: ScanLine },
  { id: 'library', icon: Library },
  { id: 'printers', icon: Printer },
  { id: 'updates', icon: Download },
  { id: 'hardware', icon: Cpu },
  { id: 'troubleshooting', icon: LifeBuoy }
]

// Welches Kapitel das "?" eines App-Bereichs oeffnet.
export const PAGE_TO_CHAPTER: Record<PageId, string> = {
  drucker: 'printers',
  station: 'read-send',
  bibliothek: 'library',
  einstellungen: 'getting-started',
  hilfe: 'getting-started'
}

// Markdown-Inhalte und Bilder zur Buildzeit einlesen.
const rawModules = import.meta.glob('./content/*/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const imageModules = import.meta.glob('./images/*', {
  query: '?url',
  import: 'default',
  eager: true
}) as Record<string, string>

export function getChapterText(id: string, lang: HelpLang): string {
  return rawModules[`./content/${lang}/${id}.md`] ?? rawModules[`./content/en/${id}.md`] ?? ''
}

export function getChapterTitle(id: string, lang: HelpLang): string {
  const text = getChapterText(id, lang)
  const m = /^#\s+(.+)$/m.exec(text)
  return m ? m[1].trim() : id
}

// Bildpfad aus dem Markdown ("images/foo.png" oder "./images/foo.png")
// auf die gebuendelte URL aufloesen. App-Screenshots gibt es je Sprache
// (z. B. station-de.png); zuerst die sprachspezifische, sonst die Basisdatei.
export function resolveHelpImage(src: string, lang?: HelpLang): string | undefined {
  const name = src.replace(/^\.?\/?/, '').replace(/^images\//, '')
  if (lang) {
    const dot = name.lastIndexOf('.')
    const langName = dot > 0 ? `${name.slice(0, dot)}-${lang}${name.slice(dot)}` : `${name}-${lang}`
    const localized = imageModules[`./images/${langName}`]
    if (localized) return localized
  }
  return imageModules[`./images/${name}`]
}

export interface HelpSearchHit {
  id: string
  title: string
  snippet: string
}

// Einfache Volltextsuche ueber alle Kapitel der aktiven Sprache.
export function searchHelp(query: string, lang: HelpLang): HelpSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: HelpSearchHit[] = []
  for (const { id } of HELP_CHAPTERS) {
    const text = getChapterText(id, lang)
    const lower = text.toLowerCase()
    const idx = lower.indexOf(q)
    if (idx < 0) continue
    // Textzeile um den Treffer herum als Vorschau (ohne Markdown-Zeichen).
    const lineStart = lower.lastIndexOf('\n', idx) + 1
    let lineEnd = lower.indexOf('\n', idx)
    if (lineEnd < 0) lineEnd = text.length
    const snippet = text
      .slice(lineStart, lineEnd)
      .replace(/^#{1,4}\s+/, '')
      .replace(/[*`>|]/g, '')
      .trim()
    hits.push({ id, title: getChapterTitle(id, lang), snippet: snippet.slice(0, 160) })
  }
  return hits
}
