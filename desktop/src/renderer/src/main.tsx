import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/archivo'
import i18n, { normalizeLang, type AppLang } from './i18n'
import App from './App'
import { Preview } from './pages/Preview'
import { ToastProvider } from './context/ToastContext'
import { installMockApi } from './preview/mockApi'
import type { Selection } from './components/library/context'
import type { PageId } from './components/Sidebar'
import './index.css'

// Vorschau-Modus fuer Screenshots: #/preview/<seite> (optional ?theme=light|dark&lang=de|en|es).
// Seiten: graphic | drucker | station | bibliothek | filament | spool | vendor | einstellungen
const hash = window.location.hash || ''
const seg = hash.replace(/^#\/?/, '').split('?')[0] // z. B. "preview/station"
const isPreview = seg.startsWith('preview')
const page = seg.split('/')[1] || 'graphic'
const params = new URLSearchParams(hash.split('?')[1] || '')
const theme: 'dark' | 'light' = params.get('theme') === 'light' ? 'light' : 'dark'
const lang: AppLang = normalizeLang(params.get('lang')) || 'de'
const printersParam = params.get('printers')
const printerCount = printersParam != null ? Number(printersParam) : undefined

// Waehlt fuer die Bibliothek-Vorschau das anzuzeigende Detail.
const BIB_SELECTION: Record<string, Selection> = {
  filament: { kind: 'filament', id: 1 },
  spool: { kind: 'spool', id: 42 },
  vendor: { kind: 'vendor', id: 1 }
}

function previewTree(): JSX.Element {
  if (page === 'graphic') {
    return (
      <ToastProvider>
        <Preview />
      </ToastProvider>
    )
  }
  if (page === 'bibliothek' || page in BIB_SELECTION) {
    return <App initialPage="bibliothek" bibliothekSelection={BIB_SELECTION[page]} />
  }
  return <App initialPage={page as PageId} />
}

if (isPreview) {
  document.documentElement.classList.toggle('dark', theme !== 'light')
  i18n.changeLanguage(lang)
  installMockApi({ theme, lang, printerCount })
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

root.render(
  isPreview ? (
    previewTree()
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
)
