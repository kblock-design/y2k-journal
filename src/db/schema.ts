import { Dexie, type EntityTable, type Table } from 'dexie'
import type { DayLog, Pet, Settings } from '../types'

// All data lives in IndexedDB on the device. Nothing here may touch the network.

export const DB_NAME = 'burn-book'

/** Primary key of the one-and-only settings record. */
export const SETTINGS_KEY = 'settings'

export interface SettingsRow extends Settings {
  id: typeof SETTINGS_KEY
}

export class TrackerDB extends Dexie {
  logs!: Table<DayLog, string>
  pets!: EntityTable<Pet, 'id'>
  settings!: Table<SettingsRow, string>

  constructor(name: string = DB_NAME) {
    super(name)

    // Schema history. Never edit a released version in place: add a new
    // `this.version(n + 1).stores({...}).upgrade(tx => ...)` below it.
    // Only indexed fields are listed; every other field is stored as-is.
    this.version(1).stores({
      logs: 'date', // one row per local calendar day
      pets: '++id', // auto-increment; the living pet has diedOn === null (null is not indexable)
      settings: 'id', // single row, id === SETTINGS_KEY
    })

    this.on('ready', () => {
      // Fire and forget: must not delay or fail the open.
      void requestPersistentStorage()
    })
  }
}

let persistRequested = false

/**
 * Ask the browser not to evict our data under storage pressure (Safari
 * otherwise may clear site data after a period of no use). Best effort.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (persistRequested) return false
  persistRequested = true
  try {
    if (typeof navigator === 'undefined') return false
    const storage = (navigator as Navigator & { storage?: StorageManager }).storage
    if (!storage?.persist) return false
    if (storage.persisted && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return false
  }
}

export const db = new TrackerDB()
