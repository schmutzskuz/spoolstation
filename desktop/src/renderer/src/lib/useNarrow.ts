import { useEffect, useRef, useState, type RefObject } from 'react'

// Misst die tatsaechliche Breite eines Containers (nicht des Viewports) und
// meldet, ob sie unter dem Schwellwert liegt. Noetig, weil das Detail-Panel in
// der Bibliothek viel schmaler ist als das Fenster – normale Tailwind-Breakpoints
// (die am Viewport haengen) passen dort nicht.
export function useNarrow(threshold = 560): [RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setNarrow(e.contentRect.width < threshold)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [threshold])
  return [ref, narrow]
}
