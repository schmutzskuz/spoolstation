import { Printer, Radio, Library, Settings, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '../../../shared/version'

export type PageId = 'drucker' | 'station' | 'bibliothek' | 'einstellungen' | 'hilfe'

const items: { id: PageId; key: string; icon: typeof Radio }[] = [
  { id: 'drucker', key: 'nav.printer', icon: Printer },
  { id: 'station', key: 'nav.station', icon: Radio },
  { id: 'bibliothek', key: 'nav.library', icon: Library },
  { id: 'einstellungen', key: 'nav.settings', icon: Settings },
  { id: 'hilfe', key: 'nav.help', icon: HelpCircle }
]

export function Sidebar({
  active,
  onSelect
}: {
  active: PageId
  onSelect: (id: PageId) => void
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <aside className="flex w-44 shrink-0 flex-col border-r border-border">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Radio className="h-4 w-4" />
        </div>
        <div className="text-sm">
          Spool<span className="text-primary">Station</span>
        </div>
      </div>

      <nav className="flex flex-col">
        {items.map((it) => {
          const Icon = it.icon
          const isActive = active === it.id
          return (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              className={cn(
                'flex items-center gap-3 border-l-2 px-4 py-2 text-sm transition-colors',
                isActive
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {t(it.key)}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto px-4 py-3 text-xs text-muted-foreground">App v{APP_VERSION}</div>
    </aside>
  )
}
