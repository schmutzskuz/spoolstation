import type { ReactNode } from 'react'

// narrow erzwingt eine Spalte (fuer schmale Container, s. useNarrow).
export function Section({
  title,
  cols = 2,
  narrow = false,
  children
}: {
  title: string
  cols?: 1 | 2 | 3
  narrow?: boolean
  children: ReactNode
}): JSX.Element {
  const grid = narrow || cols === 1 ? 'grid-cols-1' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className={`grid grid-cols-1 gap-x-4 gap-y-3 ${grid}`}>{children}</div>
    </section>
  )
}
