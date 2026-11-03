import { describe, it, expect } from 'vitest'
import de from '../src/locales/de.json'
import en from '../src/locales/en.json'
import es from '../src/locales/es.json'

// Sammelt alle verschachtelten Schluessel als Pfade ("printer.title").
// i18next-Pluralsuffixe (_one/_other) werden auf den Basis-Schluessel reduziert,
// weil nicht jede Sprache dieselben Pluralformen braucht.
function keyPaths(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const out = new Set<string>()
  for (const [k, v] of Object.entries(obj)) {
    const base = k.replace(/_(zero|one|two|few|many|other)$/, '')
    const path = prefix ? `${prefix}.${base}` : base
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const p of keyPaths(v as Record<string, unknown>, path)) out.add(p)
    } else {
      out.add(path)
    }
  }
  return out
}

const langs = { de, en, es } as const
const keys = {
  de: keyPaths(de as Record<string, unknown>),
  en: keyPaths(en as Record<string, unknown>),
  es: keyPaths(es as Record<string, unknown>)
}

// Deutsch ist die Referenz (Originalsprache der UI).
const reference = keys.de

describe('Uebersetzungen de/en/es', () => {
  for (const lang of ['en', 'es'] as const) {
    it(`${lang}: keine fehlenden Schluessel gegenueber de`, () => {
      const missing = [...reference].filter((k) => !keys[lang].has(k))
      expect(missing, `fehlend in ${lang}.json:\n${missing.join('\n')}`).toEqual([])
    })
    it(`${lang}: keine ueberfluessigen Schluessel gegenueber de`, () => {
      const extra = [...keys[lang]].filter((k) => !reference.has(k))
      expect(extra, `ueberfluessig in ${lang}.json:\n${extra.join('\n')}`).toEqual([])
    })
  }

  it('keine leeren Werte', () => {
    const empties: string[] = []
    const walk = (obj: Record<string, unknown>, lang: string, prefix = ''): void => {
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object') walk(v as Record<string, unknown>, lang, path)
        else if (typeof v === 'string' && v.trim() === '') empties.push(`${lang}:${path}`)
      }
    }
    for (const [lang, data] of Object.entries(langs)) walk(data as Record<string, unknown>, lang)
    expect(empties).toEqual([])
  })
})
