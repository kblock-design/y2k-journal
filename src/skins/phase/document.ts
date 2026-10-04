import { applyColourway } from './prefs'

/** Document-level look owned by this skin, applied as soon as its chunk loads. */
export function applyDocumentLook(): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.skin = 'phase'
  // Sets `data-ph-colour` and the matching <meta name="theme-color"> (cream by default).
  applyColourway()
}
