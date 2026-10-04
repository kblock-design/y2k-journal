import { createPref, usePref } from '../../core/prefs'
import { STICKER_THEMES } from './stickerThemes'
import type { StickerTheme } from './stickerThemes'

// Y2K appearance preferences: title style, sticker theme and desktop background.
// Per-device conveniences built on the core preference store (src/core/prefs.ts).

// `short` names are what the collapsed Appearance window lists ("Chrome · Chrome · Silver").
export const TITLE_STYLES = [
  { key: 'chrome', label: 'Chrome bubble', short: 'Chrome' },
  { key: 'cutout', label: 'Cut-out letters', short: 'Cut-out' },
  { key: 'glitter', label: 'Glitter script', short: 'Glitter' },
  { key: 'wordart', label: 'Rainbow WordArt', short: 'WordArt' },
  { key: 'pixel', label: 'Pixel prompt', short: 'Pixel' },
] as const
export type TitleStyle = (typeof TITLE_STYLES)[number]['key']

/**
 * Desktop backgrounds; the looks themselves are CSS in y2k.css, keyed by `data-bg` on <html>.
 * `label` is the picker caption (kept to one or two short words so four fit across a phone).
 */
export const BACKGROUNDS = [
  { key: 'chrome', label: 'Silver', themeColor: '#f2f3f6' },
  { key: 'glitter', label: 'Glitter', themeColor: '#ffb3d9' },
  { key: 'holo', label: 'Holo', themeColor: '#f6c3ec' },
  { key: 'desktop', label: 'Retro', themeColor: '#97adf5' },
  { key: 'sky', label: 'Lilac sky', themeColor: '#bba5ff' },
  { key: 'leopard', label: 'Leopard', themeColor: '#ffb8dc' },
  { key: 'midnight', label: 'Midnight', themeColor: '#170b34' },
] as const
export type Background = (typeof BACKGROUNDS)[number]['key']

export { STICKER_THEMES }
export type { StickerTheme }

/** Puts the background on <html> (so it also covers iOS overscroll) and tints the browser chrome. */
function applyBackground(bg: Background) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.bg = bg
  const color = BACKGROUNDS.find((b) => b.key === bg)?.themeColor
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}

// The title-style key predates this file; keep it so existing choices carry over.
// Sticker theme and background moved to new keys when the default look became chrome, so
// everyone starts on the new defaults once (their old picks remain in the pickers).
const titleStyle = createPref<TitleStyle>('burn-book:title-style', TITLE_STYLES, 'cutout')
const stickerTheme = createPref<StickerTheme>('burn-book:sticker-theme-v2', STICKER_THEMES, 'chrome')
const background = createPref<Background>('burn-book:background-v2', BACKGROUNDS, 'chrome', applyBackground)
// Document-level look owned by this skin: applied as soon as the skin's chunk loads
// (before its first render), and only ever in the Y2K skin.
applyBackground(background.get())

export const useTitleStyle = () => usePref(titleStyle)
export const setTitleStyle = titleStyle.set
export const useStickerTheme = () => usePref(stickerTheme)
export const setStickerTheme = stickerTheme.set
export const useBackground = () => usePref(background)
export const setBackground = background.set
