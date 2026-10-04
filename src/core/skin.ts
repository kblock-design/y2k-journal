import { DEFAULT_SKIN, SKINS } from '../skins'
import type { SkinInfo } from '../skins'
import { createPref } from './prefs'

/** The stored skin choice (`burn-book:skin`). Unknown values fall back to the default. */
const skinPref = createPref<string>('burn-book:skin', SKINS, DEFAULT_SKIN)

/** Looks a skin up by key; falls back to the default skin. */
function skinInfo(key: string): SkinInfo {
  return SKINS.find((s) => s.key === key) ?? SKINS.find((s) => s.key === DEFAULT_SKIN) ?? SKINS[0]
}

/** The skin chosen at startup (the one running now). Fixed for the life of the page. */
const active = skinInfo(skinPref.get())

/** Registry entry of the skin running now. */
export function activeSkin(): SkinInfo {
  return active
}

/**
 * Switches skin: stores the choice and reloads the page, so the new skin starts from a clean
 * document (no CSS, fonts or `<html>` attributes left over from the old one). No-op for the
 * active skin or an unknown key.
 */
export function setSkin(key: string): void {
  if (key === active.key || !SKINS.some((s) => s.key === key)) return
  skinPref.set(key)
  window.location.reload()
}

/**
 * Forgets the stored skin and reloads into the default one. For recovery when a skin fails
 * to load.
 */
export function resetSkin(): void {
  skinPref.set(DEFAULT_SKIN)
  window.location.reload()
}

export { SKINS }
export type { SkinInfo }
