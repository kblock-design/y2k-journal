import { useCallback, useEffect, useRef, useState } from 'react'
import { getAllLogs, getAllPets, getCurrentPet, getSettings } from '../db'
import type { DayLog, Pet, Settings } from '../types'

export interface AppData {
  settings: Settings
  /** Oldest first. */
  logs: DayLog[]
  /** Oldest first. */
  pets: Pet[]
  currentPet: Pet | undefined
}

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: AppData }

/**
 * Loads everything the UI needs from the db in one go. Call `reload()` after any write;
 * it resolves once the new data is in state. The dataset is small (one row per day),
 * so reloading it all is simpler than tracking individual changes.
 */
export function useAppData() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const generation = useRef(0)

  const reload = useCallback(async () => {
    const gen = ++generation.current
    try {
      const [settings, logs, pets, currentPet] = await Promise.all([
        getSettings(),
        getAllLogs(),
        getAllPets(),
        getCurrentPet(),
      ])
      if (gen === generation.current) setState({ status: 'ready', data: { settings, logs, pets, currentPet } })
    } catch (error) {
      // Keep showing the last good data if a background refresh fails.
      if (gen === generation.current) {
        setState((prev) => (prev.status === 'ready' ? prev : { status: 'error', error }))
      }
      console.error('Failed to load data', error)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { state, reload }
}
