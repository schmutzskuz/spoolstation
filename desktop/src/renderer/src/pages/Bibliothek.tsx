import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  ScanLine,
  Trash2,
  Archive,
  RotateCw,
  SlidersHorizontal,
  X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConnection } from '@/context/ConnectionContext'
import { HelpButton } from '@/components/HelpButton'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  Input,
  Label,
  Select,
  Spinner
} from '@/components/ui'
import { LibraryCtx, type Selection } from '@/components/library/context'
import { FilamentDetail } from '@/components/library/FilamentDetail'
import { SpoolDetail, DeleteSpoolDialog } from '@/components/library/SpoolDetail'
import { VendorDetail } from '@/components/library/VendorDetail'
import { SpoolGraphic, SpoolGraphicFor } from '@/components/library/SpoolGraphic'
import { FilamentPicker } from '@/components/library/FilamentPicker'
import { NewSpoolWizard } from './NewSpoolWizard'
import { cardUidsOf, formatWeight, relativeTime, spoolLabel } from '@/lib/spool'
import { readTag } from '@/lib/actions'
import { useJob } from '@/lib/useJob'
import { resetJob, startJob } from '@/lib/jobStore'
import { cn } from '@/lib/utils'
import type {
  SpoolmanField,
  SpoolmanFilament,
  SpoolmanSpool,
  SpoolmanVendor
} from '../../../shared/types'

type GroupBy = 'filament' | 'vendor' | 'none'
type SortBy = 'last_used' | 'name' | 'remaining' | 'registered'
const PAGE = 30

export function BibliothekPage({ initialSelection }: { initialSelection?: Selection } = {}): JSX.Element {
  const { t } = useTranslation()
  const { settings, spoolmanConnected, target, status, connected } = useConnection()
  const url = settings.spoolmanUrl
  const canTag = connected && !!status?.nfc_ok

  const [spools, setSpools] = useState<SpoolmanSpool[]>([])
  const [filaments, setFilaments] = useState<SpoolmanFilament[]>([])
  const [vendors, setVendors] = useState<SpoolmanVendor[]>([])
  const [spoolFields, setSpoolFields] = useState<SpoolmanField[]>([])
  const [filamentFields, setFilamentFields] = useState<SpoolmanField[]>([])
  const [vendorFields, setVendorFields] = useState<SpoolmanField[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection>(initialSelection ?? null)

  const [groupBy, setGroupBy] = useState<GroupBy>('filament')
  const [sortBy, setSortBy] = useState<SortBy>('last_used')
  const [q, setQ] = useState('')
  const [matFilter, setMatFilter] = useState('')
  const [venFilter, setVenFilter] = useState('')
  const [locFilter, setLocFilter] = useState('')
  const [tagState, setTagState] = useState<'all' | 'with' | 'without'>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)

  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStart, setWizardStart] = useState<SpoolmanFilament | undefined>(undefined)
  const [filamentOpen, setFilamentOpen] = useState(false)
  const [readOpen, setReadOpen] = useState(false)
  const [rowDelete, setRowDelete] = useState<SpoolmanSpool | null>(null)
  const [bulk, setBulk] = useState<null | 'delete' | 'archive'>(null)

  const ensuredRef = useRef(false)
  const reload = useCallback(async () => {
    if (!url) {
      setError(t('lib.noUrl'))
      return
    }
    setLoading(true)
    setError(null)
    if (!ensuredRef.current) {
      await window.api.spoolman.ensureFields(url)
      ensuredRef.current = true
    }
    const [sp, fl, ve, sf, ff, vf] = await Promise.all([
      window.api.spoolman.listSpools(url),
      window.api.spoolman.listFilaments(url),
      window.api.spoolman.listVendors(url),
      window.api.spoolman.listFields(url, 'spool'),
      window.api.spoolman.listFields(url, 'filament'),
      window.api.spoolman.listFields(url, 'vendor')
    ])
    if (sp.ok && sp.data) setSpools(sp.data)
    else setError(sp.error || t('lib.loadSpoolsError'))
    if (fl.ok && fl.data) setFilaments(fl.data)
    if (ve.ok && ve.data) setVendors(ve.data)
    if (sf.ok && sf.data) setSpoolFields(sf.data)
    if (ff.ok && ff.data) setFilamentFields(ff.data)
    if (vf.ok && vf.data) setVendorFields(vf.data)
    setLoading(false)
  }, [url, t])

  useEffect(() => {
    reload()
  }, [reload])

  const materials = useMemo(
    () => Array.from(new Set(filaments.map((f) => f.material).filter(Boolean))) as string[],
    [filaments]
  )
  const locations = useMemo(
    () => Array.from(new Set(spools.map((s) => s.location).filter(Boolean))) as string[],
    [spools]
  )

  function spoolMatchesSearch(s: SpoolmanSpool): boolean {
    if (!q) return true
    const hay = [s.filament?.vendor?.name, s.filament?.material, s.filament?.name, s.location, s.comment, '#' + s.id, ...cardUidsOf(s)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q.toLowerCase())
  }
  function spoolPasses(s: SpoolmanSpool): boolean {
    if (!showArchived && s.archived) return false
    if (matFilter && s.filament?.material !== matFilter) return false
    if (venFilter && String(s.filament?.vendor?.id) !== venFilter) return false
    if (locFilter && s.location !== locFilter) return false
    const uids = cardUidsOf(s)
    if (tagState === 'with' && uids.length === 0) return false
    if (tagState === 'without' && uids.length > 0) return false
    return spoolMatchesSearch(s)
  }
  const noSpoolOnlyFilter = tagState === 'all' && !locFilter

  interface Group {
    key: string
    sel: Selection
    color?: string
    title: string
    subtitle: string
    material?: string
    count: number
    sum: number
    lastUsed?: string
    registered?: string
    spools: SpoolmanSpool[]
  }

  const groups: Group[] = useMemo(() => {
    const filtered = spools.filter(spoolPasses)
    const sumOf = (arr: SpoolmanSpool[]): number => arr.reduce((a, s) => a + (s.remaining_weight || 0), 0)
    const lastOf = (arr: SpoolmanSpool[]): string | undefined =>
      arr.map((s) => s.last_used).filter(Boolean).sort().reverse()[0] as string | undefined

    let gs: Group[] = []
    if (groupBy === 'filament') {
      const byFil = new Map<number, SpoolmanSpool[]>()
      for (const s of filtered) {
        const id = s.filament?.id
        if (id == null) continue
        if (!byFil.has(id)) byFil.set(id, [])
        byFil.get(id)!.push(s)
      }
      for (const f of filaments) {
        const sp = byFil.get(f.id) || []
        const fq = !q || [f.vendor?.name, f.material, f.name].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase())
        const fFilterOk = (!matFilter || f.material === matFilter) && (!venFilter || String(f.vendor?.id) === venFilter)
        if (sp.length === 0 && !(noSpoolOnlyFilter && fq && fFilterOk)) continue
        if (sp.length === 0 && !fq) continue
        gs.push({
          key: 'f' + f.id,
          sel: { kind: 'filament', id: f.id },
          color: f.color_hex || (f.multi_color_hexes || '').split(',')[0],
          title: f.name || f.material || t('lib.filamentN', { id: f.id }),
          subtitle: f.vendor?.name || '',
          material: f.material,
          count: sp.length,
          sum: sumOf(sp),
          lastUsed: lastOf(sp),
          registered: f.registered,
          spools: sp
        })
      }
    } else if (groupBy === 'vendor') {
      const byVen = new Map<string, SpoolmanSpool[]>()
      for (const s of filtered) {
        const key = s.filament?.vendor ? String(s.filament.vendor.id) : '0'
        if (!byVen.has(key)) byVen.set(key, [])
        byVen.get(key)!.push(s)
      }
      for (const [key, sp] of byVen) {
        const ven = vendors.find((v) => String(v.id) === key)
        gs.push({
          key: 'v' + key,
          sel: ven ? { kind: 'vendor', id: ven.id } : null,
          title: ven?.name || t('lib.noVendor'),
          subtitle: t('lib.spoolsCount', { count: sp.length }),
          count: sp.length,
          sum: sumOf(sp),
          lastUsed: lastOf(sp),
          spools: sp
        })
      }
    } else {
      gs = [{ key: 'all', sel: null, title: '', subtitle: '', count: filtered.length, sum: sumOf(filtered), spools: filtered }]
    }

    const cmp: Record<SortBy, (a: Group, b: Group) => number> = {
      name: (a, b) => a.title.localeCompare(b.title),
      remaining: (a, b) => b.sum - a.sum,
      registered: (a, b) => (b.registered || '').localeCompare(a.registered || ''),
      last_used: (a, b) => (b.lastUsed || '').localeCompare(a.lastUsed || '')
    }
    if (groupBy !== 'none') gs.sort(cmp[sortBy])
    return gs
  }, [spools, filaments, vendors, groupBy, sortBy, q, matFilter, venFilter, locFilter, tagState, showArchived, noSpoolOnlyFilter, t])

  const pageCount = Math.max(1, Math.ceil(groups.length / PAGE))
  const pageGroups = groupBy === 'none' ? groups : groups.slice(page * PAGE, page * PAGE + PAGE)

  useEffect(() => {
    setPage(0)
  }, [groupBy, sortBy, q, matFilter, venFilter, locFilter, tagState, showArchived])

  function toggleExpand(key: string): void {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function toggleSelect(id: number): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Aktive Filter als Chips
  const chips: { label: string; clear: () => void }[] = []
  if (matFilter) chips.push({ label: t('lib.chipMaterial', { value: matFilter }), clear: () => setMatFilter('') })
  if (venFilter) chips.push({ label: t('lib.chipVendor', { value: vendors.find((v) => String(v.id) === venFilter)?.name || venFilter }), clear: () => setVenFilter('') })
  if (locFilter) chips.push({ label: t('lib.chipLocation', { value: locFilter }), clear: () => setLocFilter('') })
  if (tagState !== 'all') chips.push({ label: tagState === 'with' ? t('lib.withTag') : t('lib.withoutTag'), clear: () => setTagState('all') })
  if (showArchived) chips.push({ label: t('lib.archived'), clear: () => setShowArchived(false) })
  const filterCount = chips.length

  const ctxValue = {
    url,
    spools,
    filaments,
    vendors,
    spoolFields,
    filamentFields,
    vendorFields,
    loading,
    reload,
    select: (sel: Selection) => setSelection(sel),
    selection
  }

  function renderSpoolRow(s: SpoolmanSpool): JSX.Element {
    const uids = cardUidsOf(s)
    const active = selection?.kind === 'spool' && selection.id === s.id
    return (
      <div
        key={s.id}
        className={cn(
          'group flex items-center gap-2 rounded px-2 py-1 text-xs',
          active ? 'bg-primary/10' : 'hover:bg-accent'
        )}
      >
        <input type="checkbox" className="h-3.5 w-3.5" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} onClick={(e) => e.stopPropagation()} />
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setSelection({ kind: 'spool', id: s.id })}>
          <SpoolGraphicFor spool={s} size={40} />
          <span className="w-8 shrink-0 text-muted-foreground">#{s.id}</span>
          <span className="truncate text-muted-foreground">{relativeTime(s.last_used)}</span>
          <span className="ml-auto shrink-0 text-right">{Math.round(s.remaining_weight || 0)} g</span>
          {uids.length > 0 && <Badge variant="success" className="shrink-0 px-1.5 py-0">{t('lib.tagBadge')}</Badge>}
          {s.archived && <Badge variant="muted" className="shrink-0 px-1.5 py-0">{t('lib.archShort')}</Badge>}
        </button>
        <button
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setRowDelete(s) }}
          title={t('lib.deleteTitle')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <LibraryCtx.Provider value={ctxValue}>
      <div className="flex h-full min-h-0">
        {/* Links: Liste (feste Breite, eigener Scroll) */}
        <div className="flex h-full w-[420px] shrink-0 flex-col border-r border-border">
          <div className="space-y-2 border-b border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-sm font-semibold">
                {t('lib.title')}
                <HelpButton chapter="library" />
              </span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={!canTag} onClick={() => setReadOpen(true)}>
                  <ScanLine className="h-4 w-4" /> {t('lib.readTag')}
                </Button>
                <Button size="sm" variant="secondary" disabled={!spoolmanConnected} onClick={() => setFilamentOpen(true)}>
                  <Plus className="h-4 w-4" /> {t('lib.filament')}
                </Button>
                <Button size="sm" disabled={!spoolmanConnected} onClick={() => { setWizardStart(undefined); setWizardOpen(true) }}>
                  <Plus className="h-4 w-4" /> {t('lib.spool')}
                </Button>
              </div>
            </div>

            <Input placeholder={t('lib.searchAll')} value={q} onChange={(e) => setQ(e.target.value)} className="h-9" />

            <div className="flex items-center gap-2">
              <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="h-8 flex-1 text-xs">
                <option value="filament">{t('lib.byFilament')}</option>
                <option value="vendor">{t('lib.byVendor')}</option>
                <option value="none">{t('lib.noGrouping')}</option>
              </Select>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="h-8 flex-1 text-xs">
                <option value="last_used">{t('lib.sortLastUsed')}</option>
                <option value="name">{t('lib.sortName')}</option>
                <option value="remaining">{t('lib.sortRemaining')}</option>
                <option value="registered">{t('lib.sortRegistered')}</option>
              </Select>
              <FilterPopover
                open={filterOpen}
                setOpen={setFilterOpen}
                count={filterCount}
                materials={materials}
                locations={locations}
                vendors={vendors}
                matFilter={matFilter}
                setMatFilter={setMatFilter}
                venFilter={venFilter}
                setVenFilter={setVenFilter}
                locFilter={locFilter}
                setLocFilter={setLocFilter}
                tagState={tagState}
                setTagState={setTagState}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                onReset={() => { setMatFilter(''); setVenFilter(''); setLocFilter(''); setTagState('all'); setShowArchived(false) }}
              />
              <IconBtn title={t('common.reload')} onClick={reload}><RotateCw className={cn('h-4 w-4', loading && 'animate-spin')} /></IconBtn>
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {chips.map((c, i) => (
                  <button key={i} onClick={c.clear} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent">
                    {c.label} <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {selected.size > 0 && (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
                <span>{t('lib.selected', { count: selected.size })}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7" onClick={() => setBulk('archive')}><Archive className="h-3.5 w-3.5" /> {t('lib.archive')}</Button>
                  <Button size="sm" variant="destructive" className="h-7" onClick={() => setBulk('delete')}><Trash2 className="h-3.5 w-3.5" /> {t('common.delete')}</Button>
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!spoolmanConnected && <Alert variant="warning" className="mb-2">{t('lib.noSpoolman')}</Alert>}
            {error && <Alert variant="danger" className="mb-2">{error}</Alert>}
            {loading && spools.length === 0 ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Spinner /> {t('common.loading')}</div>
            ) : groupBy === 'none' ? (
              <div className="space-y-0.5">{pageGroups[0]?.spools.map(renderSpoolRow)}</div>
            ) : (
              <div className="space-y-1.5">
                {pageGroups.map((g) => {
                  const open = expanded.has(g.key)
                  return (
                    <div key={g.key} className="border-b border-border">
                      <div className="flex items-center gap-1.5 py-2">
                        <button className="shrink-0 text-muted-foreground" onClick={() => toggleExpand(g.key)}>
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => g.sel && setSelection(g.sel)}>
                          {groupBy === 'filament' && <SpoolGraphic size={40} colors={g.color ? [g.color] : undefined} />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium">{g.title}</span>
                              {g.material && <Badge variant="muted" className="px-1.5 py-0">{g.material}</Badge>}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {g.subtitle}
                              {groupBy === 'filament' ? `  ${t('lib.spoolsCount', { count: g.count })}` : ''}
                            </div>
                          </div>
                          {g.count > 0 && <span className="shrink-0 text-sm">{formatWeight(g.sum)}</span>}
                          {g.count === 0 && <Badge variant="warning" className="shrink-0 px-1.5 py-0">{t('lib.emptyBadge')}</Badge>}
                        </button>
                      </div>
                      {open && g.spools.length > 0 && <div className="space-y-0.5 pb-2 pl-6">{g.spools.map(renderSpoolRow)}</div>}
                    </div>
                  )
                })}
                {groups.length === 0 && !loading && (
                  <div className="py-8 text-center text-sm text-muted-foreground">{t('common.nothingFound')}</div>
                )}
              </div>
            )}
          </div>

          {groupBy !== 'none' && pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 border-t border-border p-2 text-xs">
              <Button size="sm" variant="outline" className="h-7" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>{t('common.back')}</Button>
              <span className="text-muted-foreground">{t('lib.pageOf', { page: page + 1, total: pageCount })}</span>
              <Button size="sm" variant="outline" className="h-7" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>{t('common.next')}</Button>
            </div>
          )}
        </div>

        {/* Rechts: Detail (eigener Scroll) */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          <DetailPanel selection={selection} spools={spools} filaments={filaments} vendors={vendors} />
        </div>
      </div>

      {/* Dialoge */}
      <NewSpoolWizard
        open={wizardOpen}
        startFilament={wizardStart}
        onClose={() => { setWizardOpen(false); setWizardStart(undefined) }}
        onCreated={reload}
      />
      <Dialog open={filamentOpen} onClose={() => setFilamentOpen(false)} title={t('lib.newFilament')} wide
        description={t('lib.newFilamentDesc')}>
        <FilamentPicker
          url={url}
          filamentFields={filamentFields}
          includeOwn={false}
          actions={[
            { key: 'create', label: t('lib.createFilament') },
            { key: 'addspool', label: t('lib.createAndAddSpool'), variant: 'outline' }
          ]}
          onResult={(f, key) => {
            setFilamentOpen(false)
            reload()
            if (key === 'addspool') { setWizardStart(f); setWizardOpen(true) }
            else setSelection({ kind: 'filament', id: f.id })
          }}
        />
      </Dialog>
      <ReadTagDialog open={readOpen} onClose={() => setReadOpen(false)} station={target} url={url} spools={spools} onFound={(id) => { setReadOpen(false); setSelection({ kind: 'spool', id }) }} />
      {rowDelete && (
        <DeleteSpoolDialog
          spool={rowDelete}
          siblingCount={spools.filter((x) => x.filament?.id === rowDelete.filament?.id).length}
          onClose={() => setRowDelete(null)}
          onDone={() => { setRowDelete(null); reload() }}
        />
      )}
      {bulk && (
        <BulkDialog op={bulk} ids={Array.from(selected)} spools={spools} url={url} onClose={() => setBulk(null)} onDone={() => { setBulk(null); setSelected(new Set()); reload() }} />
      )}
    </LibraryCtx.Provider>
  )
}

function IconBtn({ title, onClick, disabled, children }: { title: string; onClick: () => void; disabled?: boolean; children: ReactNode }): JSX.Element {
  return (
    <Button size="icon" variant="outline" className="h-9 w-9" title={title} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  )
}

function FilterPopover(props: {
  open: boolean
  setOpen: (v: boolean) => void
  count: number
  materials: string[]
  locations: string[]
  vendors: SpoolmanVendor[]
  matFilter: string
  setMatFilter: (v: string) => void
  venFilter: string
  setVenFilter: (v: string) => void
  locFilter: string
  setLocFilter: (v: string) => void
  tagState: 'all' | 'with' | 'without'
  setTagState: (v: 'all' | 'with' | 'without') => void
  showArchived: boolean
  setShowArchived: (v: boolean) => void
  onReset: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="outline" className="h-8" onClick={() => props.setOpen(!props.open)}>
        <SlidersHorizontal className="h-4 w-4" /> {t('lib.filter')}
        {props.count > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{props.count}</span>}
      </Button>
      {props.open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => props.setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-72 space-y-3 rounded-md border border-border bg-card p-3 shadow-lg">
            <Row label={t('lib.material')}>
              <Select value={props.matFilter} onChange={(e) => props.setMatFilter(e.target.value)} className="h-8 text-sm">
                <option value="">{t('lib.all')}</option>
                {props.materials.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Row>
            <Row label={t('lib.vendor')}>
              <Select value={props.venFilter} onChange={(e) => props.setVenFilter(e.target.value)} className="h-8 text-sm">
                <option value="">{t('lib.all')}</option>
                {props.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Row>
            <Row label={t('lib.location')}>
              <Select value={props.locFilter} onChange={(e) => props.setLocFilter(e.target.value)} className="h-8 text-sm">
                <option value="">{t('lib.all')}</option>
                {props.locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </Row>
            <Row label={t('lib.tag')}>
              <Select value={props.tagState} onChange={(e) => props.setTagState(e.target.value as 'all' | 'with' | 'without')} className="h-8 text-sm">
                <option value="all">{t('lib.all')}</option>
                <option value="with">{t('lib.withTag')}</option>
                <option value="without">{t('lib.withoutTag')}</option>
              </Select>
            </Row>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={props.showArchived} onChange={(e) => props.setShowArchived(e.target.checked)} /> {t('lib.showArchived')}
            </label>
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={props.onReset}>{t('lib.reset')}</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  )
}

function DetailPanel({
  selection,
  spools,
  filaments,
  vendors
}: {
  selection: Selection
  spools: SpoolmanSpool[]
  filaments: SpoolmanFilament[]
  vendors: SpoolmanVendor[]
}): JSX.Element {
  const { t } = useTranslation()
  if (!selection) {
    return <div className="flex h-full items-center justify-center p-16 text-center text-sm text-muted-foreground">{t('lib.selectHint')}</div>
  }
  if (selection.kind === 'spool') {
    const s = spools.find((x) => x.id === selection.id)
    return s ? <SpoolDetail spool={s} /> : <Missing />
  }
  if (selection.kind === 'filament') {
    const f = filaments.find((x) => x.id === selection.id)
    return f ? <FilamentDetail filament={f} /> : <Missing />
  }
  const v = vendors.find((x) => x.id === selection.id)
  return v ? <VendorDetail vendor={v} /> : <Missing />
}

function Missing(): JSX.Element {
  const { t } = useTranslation()
  return <div className="p-10 text-center text-sm text-muted-foreground">{t('lib.missing')}</div>
}

/* ---------------- Tag lesen ---------------- */
interface ReadOutcome { ok: boolean; id?: number; msg?: string }

// Tag lesen ueber den Job-Store: Starten einmal, Verfolgen bei jedem Mount
// (StrictMode-sicher). Das Aufloesen der Spule ist Teil des Jobs.
function ReadTagDialog({ open, onClose, station, url, spools, onFound }: { open: boolean; onClose: () => void; station: { host: string; apiKey: string }; url: string; spools: SpoolmanSpool[]; onFound: (id: number) => void }): JSX.Element | null {
  const { t } = useTranslation()
  const key = 'read:' + station.host

  const run = async (): Promise<ReadOutcome> => {
    const res = await readTag(station)
    if (!res.ok || !res.job || res.job.state !== 'done' || !res.job.result) {
      return { ok: false, msg: res.msg || (res.job?.state === 'timeout' ? t('lib.noTag') : t('lib.readFailed')) }
    }
    const sid = res.job.result.openspool?.spool_id
    let id: number | null = null
    if (sid && /^\d+$/.test(sid)) id = Number(sid)
    if (!id) {
      const r = await window.api.spoolman.findSpoolByUid(url, res.job.result.uid)
      if (r.ok && r.data) id = r.data.id
    }
    if (id) return { ok: true, id }
    return { ok: false, msg: t('lib.noMatch', { uid: res.job.result.uid }) }
  }

  const { running, result } = useJob<ReadOutcome>(key, run, open)

  useEffect(() => {
    if (result?.ok && result.id) { const id = result.id; resetJob(key); onFound(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  function close(): void { resetJob(key); onClose() }
  function retry(): void { resetJob(key); startJob(key, run) }

  void spools
  if (!open) return null
  const footer = result && !result.ok
    ? (<><Button variant="outline" onClick={close}>{t('common.close')}</Button><Button onClick={retry}>{t('lib.retry')}</Button></>)
    : (<Button variant="outline" onClick={close}>{t('common.close')}</Button>)
  return (
    <Dialog open={open} onClose={close} title={t('lib.readTag')} description={t('lib.placeTagShort')} footer={footer}>
      {running && <div className="flex items-center gap-3 py-4 text-sm"><Spinner /> {t('lib.placeTagHint')}</div>}
      {result && !result.ok && <Alert variant="warning">{result.msg}</Alert>}
    </Dialog>
  )
}

/* ---------------- Mehrfachaktion ---------------- */
function BulkDialog({ op, ids, spools, url, onClose, onDone }: { op: 'delete' | 'archive'; ids: number[]; spools: SpoolmanSpool[]; url: string; onClose: () => void; onDone: () => void }): JSX.Element {
  const { t } = useTranslation()
  const { printerTarget } = useConnection()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function runArchive(): Promise<void> {
    setBusy(true)
    setErr(null)
    for (const id of ids) {
      const r = await window.api.spoolman.patchSpool(url, id, { archived: true })
      if (!r.ok) { setErr(r.error || t('lib.archiveFailed')); setBusy(false); return }
    }
    onDone()
  }
  async function runDelete(): Promise<void> {
    setBusy(true)
    setErr(null)
    if (printerTarget) {
      const q = await window.api.printer.query(printerTarget)
      if (q.ok && q.data) for (const slot of q.data) if (slot.spoolId && ids.includes(slot.spoolId)) await window.api.printer.clearSlot(printerTarget, slot.channel)
    }
    for (const id of ids) {
      const r = await window.api.spoolman.deleteSpool(url, id)
      if (!r.ok) { setErr(r.error || t('lib.deleteFailed')); setBusy(false); return }
    }
    onDone()
  }

  return (
    <Dialog open onClose={onClose} title={op === 'delete' ? t('lib.bulkDeleteTitle', { count: ids.length }) : t('lib.bulkArchiveTitle', { count: ids.length })}
      footer={op === 'delete' ? (
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button variant="outline" onClick={runArchive} loading={busy}>{t('lib.archiveInstead')}</Button>
          <Button variant="destructive" onClick={runDelete} loading={busy}>{t('common.delete')}</Button>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={runArchive} loading={busy}>{t('lib.archive')}</Button>
        </>
      )}>
      {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
      <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
        {ids.map((id) => {
          const s = spools.find((x) => x.id === id)
          return <div key={id} className="text-muted-foreground">#{id} {s ? '· ' + spoolLabel(s) + ' · ' + formatWeight(s.remaining_weight) : ''}</div>
        })}
      </div>
    </Dialog>
  )
}
