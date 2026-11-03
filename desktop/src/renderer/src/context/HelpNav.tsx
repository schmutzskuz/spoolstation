import { createContext, useContext, type ReactNode } from 'react'

// Erlaubt jedem Bereich, die Hilfe beim passenden Kapitel zu oeffnen
// (ueber das kleine "?" neben der Ueberschrift), ohne Props durchzureichen.
interface HelpNav {
  openHelp: (chapterId?: string) => void
}

const Ctx = createContext<HelpNav>({ openHelp: () => {} })

export function HelpNavProvider({
  openHelp,
  children
}: {
  openHelp: (chapterId?: string) => void
  children: ReactNode
}): JSX.Element {
  return <Ctx.Provider value={{ openHelp }}>{children}</Ctx.Provider>
}

export function useHelpNav(): HelpNav {
  return useContext(Ctx)
}
