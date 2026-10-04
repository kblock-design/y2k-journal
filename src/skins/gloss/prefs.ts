import { useSyncExternalStore } from 'react'
import { createPref } from '../../core/prefs'
import type { Pref } from '../../core/prefs'

// Gloss's per-device display options (localStorage, never the database or backups).

export type OnOff = 'on' | 'off'
const ON_OFF = [{ key: 'on' }, { key: 'off' }] as const

/** Pixel (Silkscreen) small labels. Default on; off sets them in Outfit. Mirrored on <html>. */
export const pixelLabelsPref = createPref<OnOff>('burn-book:gloss-pixel-labels', ON_OFF, 'on', applyPixelLabels)

/** Puts the pixel-labels choice on <html> (`data-gl-pixel`), where gloss.css reads it. */
export function applyPixelLabels(value: OnOff = pixelLabelsPref.get()): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.glPixel = value
}

/**
 * Like core `usePref`, plus a server snapshot so static rendering (tests) works too.
 * Re-renders when the preference changes.
 */
export function useOnOff(pref: Pref<OnOff>): boolean {
  return useSyncExternalStore(pref.subscribe, pref.get, pref.get) === 'on'
}

// ---------------------------------------------------------------------------
// Colourway
// ---------------------------------------------------------------------------

export type Colourway = 'silver' | 'onyx' | 'cobalt' | 'cherry' | 'gold'

/**
 * The five colourways, in picker order. Colours live in CSS (gloss.css for Silver,
 * colourways.css for the rest); `themeColor` is each one's --bg, for the browser chrome.
 */
export const COLOURWAYS: readonly { key: Colourway; label: string; themeColor: string }[] = [
  { key: 'silver', label: 'Silver', themeColor: '#efeef2' },
  { key: 'onyx', label: 'Onyx', themeColor: '#0e0e11' },
  { key: 'cobalt', label: 'Cobalt', themeColor: '#1640d6' },
  { key: 'cherry', label: 'Cherry', themeColor: '#9e1030' },
  { key: 'gold', label: 'Gold', themeColor: '#d2a84e' },
]

export const DEFAULT_COLOURWAY: Colourway = 'silver'

/** The colourway. Unknown stored values fall back to Silver. Mirrored on <html>. */
export const colourwayPref = createPref<Colourway>('burn-book:gloss-colourway', COLOURWAYS, DEFAULT_COLOURWAY, applyColourway)

/** The browser-chrome colour for a colourway. */
export function themeColorFor(value: Colourway): string {
  return (COLOURWAYS.find((c) => c.key === value) ?? COLOURWAYS[0]).themeColor
}

/**
 * Puts the colourway on <html> (`data-gl-colour`), where the CSS reads it, and matches
 * `<meta name="theme-color">` to its page colour. Runs on load and on every change.
 */
export function applyColourway(value: Colourway = colourwayPref.get()): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.glColour = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColorFor(value))
}

/** The current colourway; re-renders on change (works in static rendering too). */
export function useColourway(): Colourway {
  return useSyncExternalStore(colourwayPref.subscribe, colourwayPref.get, colourwayPref.get)
}
