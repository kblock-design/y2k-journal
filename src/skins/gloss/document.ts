import { applyColourway, applyPixelLabels } from './prefs'

/**
 * Document-level look owned by this skin, applied as soon as its chunk loads: the skin and
 * display-option attributes on <html>, and `<meta name="theme-color">` (set from the
 * colourway, so the status bar / overscroll matches the page).
 */
export function applyDocumentLook(): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.skin = 'gloss'
  applyPixelLabels()
  applyColourway()
}
