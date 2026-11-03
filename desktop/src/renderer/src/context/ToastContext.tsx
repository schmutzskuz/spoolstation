import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Undo2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Toast {
  id: number
  message: string
  onUndo?: () => void | Promise<void>
}

interface ToastApi {
  toast: (message: string, onUndo?: () => void | Promise<void>) => void
}

const ToastCtx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(1)

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, onUndo?: () => void | Promise<void>) => {
      const id = idRef.current++
      setToasts((t) => [...t, { id, message, onUndo }])
      setTimeout(() => remove(id), 5000)
    },
    [remove]
  )

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-sm shadow-lg"
          >
            <span className="max-w-xs truncate">{item.message}</span>
            {item.onUndo && (
              <button
                onClick={async () => {
                  remove(item.id)
                  await item.onUndo?.()
                }}
                className="flex shrink-0 items-center gap-1 text-primary hover:underline"
              >
                <Undo2 className="h-3.5 w-3.5" /> {t('lib.undo')}
              </button>
            )}
            <button onClick={() => remove(item.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast(): ToastApi {
  const c = useContext(ToastCtx)
  if (!c) throw new Error('useToast benötigt ToastProvider')
  return c
}
