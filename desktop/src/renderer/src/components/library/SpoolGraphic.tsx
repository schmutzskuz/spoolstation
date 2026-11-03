// Spulengrafik, Version 2 (3D-Seitenansicht wie Fluidd/Mainsail AFC).
// Geometrie, Ebenen-Reihenfolge und Proportionen EXAKT aus
// reference/SpoolGraphic.reference.tsx (v2). Nur Einbindung, Props und der
// Spool-Wrapper sind projektspezifisch.

import { useId } from 'react'
import type { SpoolmanSpool } from '../../../../shared/types'
import { decodeExtra, fillPercent } from '@/lib/spool'

export type SpoolFlange = 'cardboard' | 'black' | 'clear'

export interface SpoolGraphicProps {
  colors?: string[]
  fill?: number
  flange?: SpoolFlange
  empty?: boolean
  size?: number
  title?: string
}

const FLANGE_COLORS: Record<SpoolFlange, string> = {
  cardboard: '#C4935A',
  black: '#2A2A2A',
  clear: '#D9DDE0'
}

function withHash(hex: string): string {
  return hex.startsWith('#') ? hex : '#' + hex
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  let r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255
  const t = f < 0 ? 0 : 255,
    p = Math.abs(f)
  r = Math.round((t - r) * p + r)
  g = Math.round((t - g) * p + g)
  b = Math.round((t - b) * p + b)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
}

// Geometrie (viewBox 0 0 64 100). Achse waagerecht, Blick von vorne rechts.
const W = 64,
  H = 100,
  CY = 50
const FR = 46 // Flanschradius
const FX = 11 // horizontaler Radius der Flansch-Ellipse (Perspektive)
const T = 3 // Flanschdicke
const XB = 16 // Innenseite hinterer Flansch
const XF = 46 // Innenseite vorderer Flansch
const HUB = 12 // Kernradius
const MAX_R = 40 // Wicklung voll (Abstand zum Flanschrand 6)
const K = FX / FR
const rx = (r: number): number => r * K

export function SpoolGraphic({
  colors = ['#FFFFFF'],
  fill,
  flange = 'cardboard',
  empty = false,
  size = 110,
  title
}: SpoolGraphicProps): JSX.Element {
  const clipId = useId()
  const width = (size * W) / H

  if (empty) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={width} height={size} role="img" aria-label={title ?? 'Leerer Slot'} className="shrink-0">
        <g fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="3 3">
          <ellipse cx={XB} cy={CY} rx={FX} ry={FR} />
          <path d={`M${XB} ${CY - FR} H${XF} M${XB} ${CY + FR} H${XF}`} />
          <ellipse cx={XF} cy={CY} rx={FX} ry={FR} />
        </g>
        {title && <title>{title}</title>}
      </svg>
    )
  }

  const cols = (colors.length ? colors : ['#FFFFFF']).map(withHash)
  const f = fill === undefined ? 1 : Math.max(0, Math.min(1, fill))
  const R = HUB + (MAX_R - HUB) * f

  const fl = FLANGE_COLORS[flange]
  const flD = shade(fl, -0.3)
  const flDD = shade(fl, -0.45)
  const flL = shade(fl, 0.14)

  const base = cols[0] ?? '#FFFFFF'
  const cL = shade(base, 0.3)
  const cD = shade(base, -0.25)
  const cDD = shade(base, -0.4)
  const light = cols.every((c) => luminance(c) > 225)
  const multi = cols.length > 1
  const bandH = (2 * R) / cols.length

  const strands: number[] = []
  for (let x = XB + 2.5; x < XF; x += 2.5) strands.push(x)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={width} height={size} role="img" aria-label={title ?? 'Spule'} className="shrink-0">
      <defs>
        <clipPath id={clipId}>
          <rect x={XB} y={CY - R} width={XF - XB} height={2 * R} />
        </clipPath>
      </defs>

      {/* hinterer Flansch: Aussenseite + Dicke + Innenseite */}
      <ellipse cx={XB - T} cy={CY} rx={FX} ry={FR} fill={flDD} />
      <rect x={XB - T} y={CY - FR} width={T} height={2 * FR} fill={flDD} />
      <ellipse cx={XB} cy={CY} rx={FX} ry={FR} fill={flD} />

      {/* Kern */}
      <rect x={XB} y={CY - HUB} width={XF - XB} height={2 * HUB} fill={flDD} />

      {/* Wicklung: Stirnseite am hinteren Flansch, dann Zylinder */}
      <ellipse cx={XB} cy={CY} rx={rx(R)} ry={R} fill={cD} />
      <g clipPath={`url(#${clipId})`}>
        {cols.map((c, i) => (
          <rect key={i} x={XB} y={CY - R + i * bandH} width={XF - XB} height={bandH + 0.5} fill={c} />
        ))}
        {/* Zylinder-Schattierung als flache Baender (Licht oben, Schatten unten) */}
        <rect x={XB} y={CY - R * 0.78} width={XF - XB} height={R * 0.3} fill={cL} opacity={multi ? 0.25 : 0.6} />
        <rect x={XB} y={CY + R * 0.45} width={XF - XB} height={R * 0.3} fill={cD} opacity={multi ? 0.25 : 0.6} />
        <rect x={XB} y={CY + R * 0.75} width={XF - XB} height={R * 0.25} fill={cDD} opacity={multi ? 0.3 : 0.6} />
        {/* Wickelstraenge */}
        {strands.map((x) => (
          <line key={x} x1={x} y1={CY - R} x2={x} y2={CY + R} stroke={cDD} strokeWidth={0.35} opacity={0.35} />
        ))}
      </g>
      {light && <path d={`M${XB} ${CY - R} H${XF} M${XB} ${CY + R} H${XF}`} stroke="#9A9A9A" strokeWidth={0.6} />}

      {/* vorderer Flansch: Dicke + Aussenseite (Sichtseite) */}
      <rect x={XF} y={CY - FR} width={T} height={2 * FR} fill={flD} />
      <ellipse cx={XF} cy={CY} rx={FX} ry={FR} fill={flD} />
      <ellipse cx={XF + T} cy={CY} rx={FX} ry={FR} fill={fl} />
      <ellipse cx={XF + T - 0.6} cy={CY} rx={FX - 1.8} ry={FR - 2.2} fill="none" stroke={flL} strokeWidth={0.7} />

      {/* Nabe mit Loch */}
      <ellipse cx={XF + T} cy={CY} rx={rx(HUB + 3)} ry={HUB + 3} fill={flD} />
      <ellipse cx={XF + T + 0.5} cy={CY} rx={rx(HUB - 2)} ry={HUB - 2} fill="#1C1D1F" />

      {title && <title>{title}</title>}
    </svg>
  )
}

export function flangeTypeFrom(value?: string): SpoolFlange {
  const v = (value || '').toLowerCase()
  if (v.includes('schwarz') || v.includes('black')) return 'black'
  if (v.includes('trans') || v.includes('klar') || v.includes('clear')) return 'clear'
  return 'cardboard'
}

export function colorsOfFilament(colorHex?: string, multi?: string): string[] | undefined {
  if (multi && multi.length > 0) return multi.split(',').map((x) => withHash(x.trim()))
  if (colorHex) return [withHash(colorHex)]
  return undefined
}

export function SpoolGraphicFor({ spool, size }: { spool: SpoolmanSpool; size?: number }): JSX.Element {
  const f = spool.filament
  const colors = colorsOfFilament(f?.color_hex, f?.multi_color_hexes)
  const pct = fillPercent(spool)
  const flange = flangeTypeFrom(decodeExtra(spool.extra?.spool_type))
  return <SpoolGraphic colors={colors} fill={pct === undefined ? undefined : pct / 100} flange={flange} size={size} />
}
