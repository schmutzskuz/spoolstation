// Entwickler-Vorschau (nur ueber #/preview erreichbar, kein Electron-IPC).
// Zeigt die SpoolGraphic in allen Zustaenden sowie Beispiel-Slotkarten.
import { useTranslation } from 'react-i18next'
import { SpoolGraphic, type SpoolFlange } from '@/components/library/SpoolGraphic'
import { Badge, Button } from '@/components/ui'
import { Plus, Trash2 } from 'lucide-react'

function Cell({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-[130px] items-end">{children}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

interface Sample {
  t: string
  colors?: string[]
  fill?: number
  flange?: SpoolFlange
  empty?: boolean
  name?: string
  material?: string
  temps?: string
  rest?: string
  unknown?: boolean
}

const samples: Sample[] = [
  { t: 'Weiß voll', colors: ['#FFFFFF'], fill: 1, name: 'Generic PLA', material: 'PLA', rest: 'Rest 1000 g', temps: 'Düse 200–220 °C' },
  { t: 'Schwarz halb', colors: ['#111111'], fill: 0.5, flange: 'black', name: 'Creality PETG', material: 'PETG', rest: 'Rest 500 g' },
  { t: 'Braun fast leer', colors: ['#6F4C2F'], fill: 0.12, name: 'Generic PLA', material: 'PLA', rest: 'Rest 120 g' },
  { t: 'Mehrfarbig', colors: ['#E53935', '#FDD835', '#43A047'], fill: 0.7, name: 'Tri-Color', material: 'PLA' },
  { t: 'Leer', empty: true, name: 'Leer' },
  { t: 'Unbekannt', empty: true, unknown: true, name: 'Unbekanntes Filament' }
]

function SlotCard({ s, ch }: { s: Sample; ch: number }): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex w-[190px] flex-col items-center gap-2 border border-border p-3">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold">T{ch + 1}</span>
      </div>
      <SpoolGraphic colors={s.colors} fill={s.fill} flange={s.flange} empty={s.empty} size={110} />
      <div className="w-full text-center">
        <div className="truncate text-sm font-medium">{s.name}</div>
        {s.material && (
          <div className="mt-1">
            <Badge variant="muted" className="px-1.5 py-0">{s.material}</Badge>
          </div>
        )}
        {s.rest && <div className="mt-1 text-xs text-muted-foreground">{s.rest}</div>}
        {s.temps && <div className="mt-0.5 text-xs text-muted-foreground">{s.temps}</div>}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button size="icon" className="h-8 w-8" title={t('printer.assign')}><Plus className="h-4 w-4" /></Button>
        {!s.empty && <Button size="icon" variant="outline" className="h-8 w-8" title={t('printer.clearSlot')}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
  )
}

export function Preview(): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="min-h-full space-y-8 p-8">
      <div>
        <h1 className="text-xl font-semibold">{t('preview.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('preview.subtitle')}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t('preview.states')}</h2>
        <div className="flex flex-wrap gap-8">
          {samples.map((s, i) => (
            <Cell key={i} label={s.t}>
              <SpoolGraphic colors={s.colors} fill={s.fill} flange={s.flange} empty={s.empty} size={110} />
            </Cell>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t('preview.flangesSizes')}</h2>
        <div className="flex flex-wrap items-end gap-8">
          <Cell label="Pappe"><SpoolGraphic colors={['#1E90FF']} fill={0.8} flange="cardboard" size={110} /></Cell>
          <Cell label="Schwarz"><SpoolGraphic colors={['#1E90FF']} fill={0.8} flange="black" size={110} /></Cell>
          <Cell label="Transparent"><SpoolGraphic colors={['#FFD54F']} fill={0.8} flange="clear" size={110} /></Cell>
          <Cell label="40 px (Liste)"><SpoolGraphic colors={['#1E90FF']} fill={0.6} size={40} /></Cell>
          <Cell label="128 px"><SpoolGraphic colors={['#FFFFFF']} fill={0.9} size={128} /></Cell>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">{t('preview.printerSlots')}</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {samples.slice(0, 4).map((s, i) => <SlotCard key={i} s={s} ch={i} />)}
        </div>
      </section>
    </div>
  )
}
