import type { StickerName } from './stickers'
import { ART } from './stickers/registry'

// Sticker themes. Every screen places its stickers by naming one of the 15 original
// stickers (the "slots" below) at a fixed position, size and rotation. A theme swaps the
// sticker drawn in each slot for one of its own cast, so positions stay put while every
// screen changes character. Casts are arranged so that no desktop scatter, wordmark pair
// or window shows the same sticker twice.

type Slot =
  | 'heart'
  | 'star'
  | 'sparkle'
  | 'butterfly'
  | 'flower'
  | 'smiley'
  | 'gem'
  | 'lips'
  | 'cd'
  | 'flipPhone'
  | 'cassette'
  | 'cherry'
  | 'chromeStar'
  | 'cursor'
  | 'lipGloss'

type Cast = Readonly<Record<Slot, StickerName>>

/**
 * The default: nothing but polished metal. Thirteen pieces, so everything Home can show at
 * once (scatter, wordmark pair, window corners, the hatch form) is different.
 * `star` and `flower` share the butterfly: the hatch form and the memorial never coexist.
 */
const CHROME: Cast = {
  heart: 'chromeHeart',
  star: 'chromeButterfly',
  sparkle: 'chromeSparkle',
  butterfly: 'chromeButterfly',
  flower: 'chromeButterfly',
  smiley: 'chromeSmiley',
  gem: 'chromeCross',
  lips: 'chromeLips',
  cd: 'cd',
  flipPhone: 'chromeBolt',
  cassette: 'discoBall',
  cherry: 'chromeCherry',
  chromeStar: 'chromeStar',
  cursor: 'chromeCursor',
  lipGloss: 'chromeFlame',
}

/**
 * Cut stones only. The nine Home shows by default (scatter + the cycle, quote and fact
 * windows) are all different, as are each other screen's.
 */
const GEMS: Cast = {
  heart: 'gemPrincess',
  star: 'gemTrillion',
  sparkle: 'gemMarquise',
  butterfly: 'gem',
  flower: 'gemOval',
  smiley: 'gemOval',
  gem: 'gemPrincess',
  lips: 'gem',
  cd: 'gemRound',
  flipPhone: 'gemPear',
  cassette: 'gemEmerald',
  cherry: 'gemTrillion',
  chromeStar: 'gemStar',
  cursor: 'gem',
  lipGloss: 'gemMarquise',
}

const MIXTAPE: Cast = {
  heart: 'heart',
  star: 'star',
  sparkle: 'bolt',
  butterfly: 'headphones',
  flower: 'floppy',
  smiley: 'smiley',
  gem: 'discoBall',
  lips: 'cursor',
  cd: 'cassette',
  flipPhone: 'boombox',
  cassette: 'flipPhone',
  cherry: 'cd',
  chromeStar: 'pixelHeart',
  cursor: 'cursor',
  lipGloss: 'discoBall',
}

const BLING: Cast = {
  heart: 'gem',
  star: 'chromeStar',
  sparkle: 'sparkle',
  butterfly: 'starShades',
  flower: 'heart',
  smiley: 'star',
  gem: 'sparkle',
  lips: 'discoBall',
  cd: 'discoBall',
  flipPhone: 'nailPolish',
  cassette: 'lipGloss',
  cherry: 'lips',
  chromeStar: 'chromeStar',
  cursor: 'sparkle',
  lipGloss: 'sparkle',
}

interface StickerThemeDef {
  key: string
  label: string
  /** A few of the theme's stickers for the picker. */
  preview: readonly StickerName[]
  /** Slot -> sticker; null keeps the original stickers. */
  cast: Cast | null
}

export const STICKER_THEMES = [
  { key: 'chrome', label: 'Chrome', preview: ['chromeHeart', 'chromeStar', 'discoBall'], cast: CHROME },
  { key: 'girly', label: 'Girly pop', preview: ['heart', 'butterfly', 'lipGloss'], cast: null },
  { key: 'gems', label: 'Gems', preview: ['gemRound', 'gem', 'gemEmerald'], cast: GEMS },
  { key: 'mixtape', label: 'Mixtape', preview: ['cassette', 'headphones', 'boombox'], cast: MIXTAPE },
  { key: 'bling', label: 'Bling', preview: ['gem', 'discoBall', 'nailPolish'], cast: BLING },
  { key: 'none', label: 'No stickers', preview: [], cast: null },
] as const satisfies readonly StickerThemeDef[]

export type StickerTheme = (typeof STICKER_THEMES)[number]['key']

const CASTS = new Map<StickerTheme, Cast | null>(STICKER_THEMES.map((t) => [t.key, t.cast]))

/** Height / width of a sticker's artwork. */
function aspect(name: StickerName): number {
  const [, , w, h] = ART[name].viewBox
  return h / w
}

/**
 * What to draw in a slot placed at `size` px wide under `theme`, or null when the theme
 * shows no stickers. A stand-in of a different shape is fitted to the slot: never wider
 * than the original, and its longest side no longer than the original's longest side
 * (so a tall bottle in a wide sticker's spot doesn't hang down over a window's text).
 */
export function themedSticker(
  slot: StickerName,
  theme: StickerTheme,
  size: number,
): { name: StickerName; size: number } | null {
  if (theme === 'none') return null
  const cast = CASTS.get(theme)
  const name = cast && Object.hasOwn(cast, slot) ? cast[slot as Slot] : slot
  if (name === slot) return { name, size }
  const fitted = (size * Math.max(1, aspect(slot))) / Math.max(1, aspect(name))
  return { name, size: Math.round(Math.min(size, fitted) * 10) / 10 }
}
