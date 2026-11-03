import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ConnectionProvider, useConnection } from '@/context/ConnectionContext'
import { UpdaterProvider } from '@/context/UpdaterContext'
import { ToastProvider } from '@/context/ToastContext'
import { NavGuardProvider, useNavGuard } from '@/context/NavGuard'
import { HelpNavProvider } from '@/context/HelpNav'
import { Sidebar, type PageId } from '@/components/Sidebar'
import { StatusBar } from '@/components/StatusBar'
import { UpdateBanner } from '@/components/UpdateBanner'
import { DruckerPage } from '@/pages/Drucker'
import { StationPage } from '@/pages/Station'
import { BibliothekPage } from '@/pages/Bibliothek'
import { EinstellungenPage } from '@/pages/Einstellungen'
import { HilfePage } from '@/pages/Hilfe'
import { SetupWizard } from '@/pages/SetupWizard'
import type { Selection } from '@/components/library/context'

// initialPage/bibliothekSelection werden nur von der Entwickler-Vorschau (#/preview) genutzt.
export default function App({
  initialPage,
  bibliothekSelection
}: {
  initialPage?: PageId
  bibliothekSelection?: Selection
} = {}): JSX.Element {
  return (
    <ToastProvider>
      <NavGuardProvider>
        <ConnectionProvider>
          <UpdaterProvider>
            <Shell initialPage={initialPage} bibliothekSelection={bibliothekSelection} />
          </UpdaterProvider>
        </ConnectionProvider>
      </NavGuardProvider>
    </ToastProvider>
  )
}

function Shell({
  initialPage,
  bibliothekSelection
}: {
  initialPage?: PageId
  bibliothekSelection?: Selection
}): JSX.Element {
  const [active, setActive] = useState<PageId>(initialPage ?? 'drucker')
  const { isAnyDirty } = useNavGuard()
  const { t } = useTranslation()
  const { settings, loaded } = useConnection()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardMode, setWizardMode] = useState<'fw-update' | undefined>(undefined)
  const [helpChapter, setHelpChapter] = useState<string | undefined>(undefined)
  const [helpNonce, setHelpNonce] = useState(0)

  function openWizard(mode?: 'fw-update'): void {
    setWizardMode(mode)
    setWizardOpen(true)
  }

  // Erststart: Noch keine Station eingerichtet -> Assistent anbieten (einmal).
  const firstRunRef = useRef(false)
  useEffect(() => {
    if (loaded && !firstRunRef.current && !settings.stationHost && !settings.apiKey) {
      firstRunRef.current = true
      setWizardOpen(true)
    }
  }, [loaded, settings.stationHost, settings.apiKey])

  // Bibliothek und Hilfe nutzen die volle Breite und scrollen selbst.

  function go(id: PageId): void {
    if (id === active) return
    if (isAnyDirty() && !window.confirm(t('common.discardChanges'))) return
    setActive(id)
  }

  // Hilfe beim passenden Kapitel oeffnen (ueber das "?" eines Bereichs).
  function openHelp(chapterId?: string): void {
    if (active !== 'hilfe' && isAnyDirty() && !window.confirm(t('common.discardChanges'))) return
    setHelpChapter(chapterId)
    // Nonce hochzaehlen, damit die Hilfe auch bei gleichem Kapitel reagiert.
    setHelpNonce((n) => n + 1)
    setActive('hilfe')
  }

  // Zu einem Bereich auf einer Seite springen und ihn kurz hervorheben
  // (für die klickbaren Update-Hinweise in der Statusleiste).
  function goToSection(id: PageId, anchor: string): void {
    if (id !== active) {
      if (isAnyDirty() && !window.confirm(t('common.discardChanges'))) return
      setActive(id)
    }
    setTimeout(() => {
      const el = document.getElementById(anchor)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el.classList.add('section-highlight')
      setTimeout(() => el.classList.remove('section-highlight'), 1800)
    }, 140)
  }

  return (
    <HelpNavProvider openHelp={openHelp}>
      <div className="flex h-full">
        <Sidebar active={active} onSelect={go} />
        <div className="flex min-w-0 flex-1 flex-col">
          <StatusBar onNavigateSection={goToSection} />
          <UpdateBanner />
          <main className="min-h-0 flex-1">
            {active === 'drucker' && <ScrollArea><DruckerPage onEditPrinter={() => go('einstellungen')} /></ScrollArea>}
            {active === 'station' && <ScrollArea><StationPage onFirmwareUsbUpdate={() => openWizard('fw-update')} /></ScrollArea>}
            {active === 'einstellungen' && <ScrollArea><EinstellungenPage onSetup={() => openWizard()} /></ScrollArea>}
            {active === 'bibliothek' && <BibliothekPage initialSelection={bibliothekSelection} />}
            {active === 'hilfe' && <HilfePage key={helpNonce} initialChapter={helpChapter} />}
          </main>
        </div>
        <SetupWizard open={wizardOpen} onClose={() => setWizardOpen(false)} initialMode={wizardMode} />
      </div>
    </HelpNavProvider>
  )
}

function ScrollArea({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">{children}</div>
    </div>
  )
}
