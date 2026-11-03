import React, { createContext, useContext, useEffect, useId, useRef } from 'react'

interface NavGuardApi {
  setDirty: (id: string, dirty: boolean) => void
  isAnyDirty: () => boolean
}

const NavGuardCtx = createContext<NavGuardApi | null>(null)

export function NavGuardProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const map = useRef(new Map<string, boolean>())
  const api: NavGuardApi = {
    setDirty: (id, dirty) => {
      if (dirty) map.current.set(id, true)
      else map.current.delete(id)
    },
    isAnyDirty: () => map.current.size > 0
  }
  return <NavGuardCtx.Provider value={api}>{children}</NavGuardCtx.Provider>
}

export function useNavGuard(): NavGuardApi {
  const c = useContext(NavGuardCtx)
  if (!c) throw new Error('useNavGuard benötigt NavGuardProvider')
  return c
}

// Meldet ein Formular als "ungespeichert", solange `dirty` true ist.
export function useUnsavedGuard(dirty: boolean): void {
  const { setDirty } = useNavGuard()
  const id = useId()
  useEffect(() => {
    setDirty(id, dirty)
    return () => setDirty(id, false)
  }, [dirty, id, setDirty])
}
