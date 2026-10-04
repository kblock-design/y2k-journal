import { useSyncExternalStore } from 'react'
import { createPref } from '../../core/prefs'

// Phase's per-device colourway (localStorage, never the database or backups). The choice is
// mirrored on <html> as `data-ph-colour`, where phase.css / colourways.css read it.

export type Colourway = 'cream' | 'cobalt' | 'hotpink' | 'forest' | 'noir'

export interface ColourwayInfo {
  key: Colourway
  label: string
  /** Browser chrome (status bar / overscroll): the colourway's page background. */
  themeColor: string
}

export const COLOURWAYS: readonly ColourwayInfo[] = [
  { key: 'cream', label: 'Cream', themeColor: '#f8f2e6' },
  { key: 'cobalt', label: 'Cobalt', themeColor: '#1f45e0' },
  { key: 'hotpink', label: 'Hot pink', themeColor: '#ff2e8a' },
  { key: 'forest', label: 'Forest', themeColor: '#173b2c' },
  { key: 'noir', label: 'Noir', themeColor: '#000000' },
]

export const DEFAULT_COLOURWAY: Colourway = 'cream'

/**
 * Stored values that aren't a colourway key (including the retired 'sorbet', 'earth', 'lilac'
 * and 'night') fall back to Cream. Applied on every change.
 */
export const colourwayPref = createPref<Colourway>(
  'burn-book:phase-colourway',
  COLOURWAYS,
  DEFAULT_COLOURWAY,
  applyColourway,
)

/** Puts the colourway on <html> and matches the browser chrome to its background. */
export function applyColourway(value: Colourway = colourwayPref.get()): void {
  if (typeof document === 'undefined') return
  const info = COLOURWAYS.find((c) => c.key === value) ?? COLOURWAYS[0]
  document.documentElement.dataset.phColour = info.key
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', info.themeColor)
}

/**
 * Like core `usePref`, plus a server snapshot so static rendering (tests) works too.
 * Re-renders when the colourway changes.
 */
export function useColourway(): Colourway {
  return useSyncExternalStore(colourwayPref.subscribe, colourwayPref.get, colourwayPref.get)
}
