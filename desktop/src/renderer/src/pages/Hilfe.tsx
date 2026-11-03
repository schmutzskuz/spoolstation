import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ExternalLink } from 'lucide-react'
import { Input, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { normalizeLang } from '@/i18n'
import { Markdown } from '@/help/Markdown'
import {
  HELP_CHAPTERS,
  getChapterText,
  getChapterTitle,
  resolveHelpImage,
  searchHelp,
  type HelpLang
} from '@/help/content'

export function HilfePage({ initialChapter }: { initialChapter?: string }): JSX.Element {
  const { t, i18n } = useTranslation()
  const lang: HelpLang = normalizeLang(i18n.language) ?? 'en'
  const [chapter, setChapter] = useState<string>(initialChapter ?? HELP_CHAPTERS[0].id)
  const [query, setQuery] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  // Wenn die Hilfe erneut mit einem anderen Kapitel geoeffnet wird ("?").
  useEffect(() => {
    if (initialChapter) {
      setChapter(initialChapter)
      setQuery('')
    }
  }, [initialChapter])

  // Beim Kapitelwechsel nach oben scrollen.
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
  }, [chapter])

  const hits = useMemo(() => searchHelp(query, lang), [query, lang])
  const text = getChapterText(chapter, lang)

  function onLink(url: string): void {
    if (url.startsWith('chapter:')) {
      setChapter(url.slice('chapter:'.length))
      setQuery('')
    } else if (/^https?:\/\//i.test(url)) {
      void window.api.system.openExternal(url)
    }
  }

  async function openBuildGuide(): Promise<void> {
    const src = await window.api.system.updateSource()
    const owner = src.configured ? src.owner : 'schmutzskuz'
    const repo = src.configured ? src.repo : 'spoolstation'
    const url = `https://github.com/${owner}/${repo}/blob/main/docs/hardware/BUILD.${lang}.md`
    await window.api.system.openExternal(url)
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Kapitel + Suche */}
      <div className="flex w-60 shrink-0 flex-col border-r border-border">
        <div className="relative p-3">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('help.search')}
            className="h-9 pl-8"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {query.trim() ? (
            hits.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">{t('common.nothingFound')}</p>
            ) : (
              hits.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    setChapter(h.id)
                    setQuery('')
                  }}
                  className="mb-1 block w-full rounded-md px-3 py-2 text-left hover:bg-accent"
                >
                  <div className="text-sm font-medium text-foreground">{h.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{h.snippet}</div>
                </button>
              ))
            )
          ) : (
            HELP_CHAPTERS.map((c) => {
              const Icon = c.icon
              const isActive = c.id === chapter
              return (
                <button
                  key={c.id}
                  onClick={() => setChapter(c.id)}
                  className={cn(
                    'mb-0.5 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{getChapterTitle(c.id, lang)}</span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Inhalt */}
      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-8 py-6">
          <Markdown text={text} resolveImage={(s) => resolveHelpImage(s, lang)} onLink={onLink} />
          {chapter === 'hardware' && (
            <Button onClick={openBuildGuide} className="mt-6">
              <ExternalLink className="h-4 w-4" />
              {t('help.openBuild')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
