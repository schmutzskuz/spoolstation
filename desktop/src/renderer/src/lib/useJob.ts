import { useEffect, useSyncExternalStore } from 'react'
import { getJob, startJob, subscribeJob, type JobEntry } from './jobStore'

// Startet einen Station-Job genau einmal (solange `enabled`) und verfolgt ihn
// ueber den Store – unabhaengig von Mount/Remount (StrictMode-sicher).
export function useJob<T>(key: string, fn: () => Promise<T>, enabled = true): JobEntry<T> {
  useEffect(() => {
    if (enabled) startJob(key, fn)
    // Start nur an `enabled`/`key` gebunden; `fn` bewusst nicht als Dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  return useSyncExternalStore(
    (cb) => subscribeJob(key, cb),
    () => getJob<T>(key)
  )
}
