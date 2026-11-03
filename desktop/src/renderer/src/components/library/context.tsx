import { createContext, useContext } from 'react'
import type {
  SpoolmanField,
  SpoolmanFilament,
  SpoolmanSpool,
  SpoolmanVendor
} from '../../../../shared/types'

export type Selection =
  | { kind: 'filament'; id: number }
  | { kind: 'spool'; id: number }
  | { kind: 'vendor'; id: number }
  | null

export interface LibraryData {
  url: string
  spools: SpoolmanSpool[]
  filaments: SpoolmanFilament[]
  vendors: SpoolmanVendor[]
  spoolFields: SpoolmanField[]
  filamentFields: SpoolmanField[]
  vendorFields: SpoolmanField[]
  loading: boolean
  reload: () => Promise<void>
  select: (sel: Selection) => void
  selection: Selection
}

export const LibraryCtx = createContext<LibraryData | null>(null)

export function useLibrary(): LibraryData {
  const c = useContext(LibraryCtx)
  if (!c) throw new Error('useLibrary benötigt LibraryCtx')
  return c
}
