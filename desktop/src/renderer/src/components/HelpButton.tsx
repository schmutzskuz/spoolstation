import { HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useHelpNav } from '@/context/HelpNav'
import { cn } from '@/lib/utils'

// Kleines "?" neben einer Bereichs-Ueberschrift, das direkt zum
// passenden Hilfe-Kapitel springt.
export function HelpButton({
  chapter,
  className
}: {
  chapter: string
  className?: string
}): JSX.Element {
  const { openHelp } = useHelpNav()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => openHelp(chapter)}
      title={t('help.openHelp')}
      aria-label={t('help.openHelp')}
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-primary',
        className
      )}
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  )
}
