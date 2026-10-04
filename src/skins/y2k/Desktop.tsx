import type { CSSProperties } from 'react'
import { BrandWord } from './BrandWord'
import { useStickerTheme, useTitleStyle } from './prefs'
import { themedSticker } from './stickerThemes'
import { Sticker } from './stickers'
import type { StickerName } from './stickers'

// The collage layer behind the windows: stickers scattered over the "desktop" background,
// peeking out between and around the windows, plus a few twinkling sparkles.
// Entirely decorative: aria-hidden, pointer-events: none, clipped so it never scrolls sideways.

interface Scatter {
  /** Slot name; the sticker theme decides what's drawn here. */
  name: StickerName
  /** Vertical position as a % of the page height. */
  top: number
  /** Horizontal position as a % of the page width (sticker centre). */
  left: number
  size: number
  rotate: number
}

// A curated few per screen, alternating sides and spaced well apart so no two ever touch
// (they sit behind the windows, half off the page edge). Slots used by a screen's own
// window corners and the wordmark pair are left out of its scatter.
const SCATTERS: Record<string, readonly Scatter[]> = {
  home: [
    { name: 'cd', top: 10, left: 97, size: 62, rotate: 12 },
    { name: 'flipPhone', top: 24, left: 2, size: 54, rotate: -14 },
    { name: 'cassette', top: 39, left: 98, size: 60, rotate: 14 },
    { name: 'chromeStar', top: 55, left: 1, size: 56, rotate: -12 },
    { name: 'lipGloss', top: 71, left: 98, size: 54, rotate: 16 },
    { name: 'smiley', top: 87, left: 2, size: 50, rotate: -8 },
  ],
  calendar: [
    { name: 'chromeStar', top: 9, left: 98, size: 54, rotate: 12 },
    { name: 'butterfly', top: 35, left: 1, size: 56, rotate: -14 },
    { name: 'cd', top: 62, left: 99, size: 60, rotate: 8 },
    { name: 'cassette', top: 88, left: 1, size: 56, rotate: -10 },
  ],
  // Settings windows wear their corner stickers top-left (Check-in, Pet graveyard), so the
  // left edge keeps a single mid-page sticker and the rest sit on the right.
  settings: [
    { name: 'cassette', top: 10, left: 98, size: 54, rotate: 14 },
    { name: 'sparkle', top: 40, left: 1, size: 46, rotate: 0 },
    { name: 'flipPhone', top: 60, left: 99, size: 52, rotate: -12 },
    { name: 'lips', top: 90, left: 98, size: 50, rotate: 10 },
  ],
  stats: [
    { name: 'chromeStar', top: 10, left: 1, size: 54, rotate: -12 },
    { name: 'gem', top: 34, left: 98, size: 50, rotate: 10 },
    { name: 'cd', top: 60, left: 1, size: 58, rotate: 8 },
    { name: 'smiley', top: 85, left: 98, size: 50, rotate: -8 },
  ],
}

const TWINKLES: readonly { top: number; left: number; size: number; delay: number }[] = [
  { top: 4, left: 28, size: 14, delay: 0 },
  { top: 17, left: 90, size: 12, delay: 1.4 },
  { top: 31, left: 6, size: 12, delay: 0.6 },
  { top: 47, left: 94, size: 14, delay: 2 },
  { top: 63, left: 5, size: 12, delay: 1 },
  { top: 79, left: 93, size: 12, delay: 2.4 },
  { top: 95, left: 12, size: 12, delay: 0.3 },
]

export function Desktop({ scene }: { scene: string }) {
  const stickers = SCATTERS[scene] ?? SCATTERS.home
  const theme = useStickerTheme()
  return (
    <div className="desktop" aria-hidden="true">
      {stickers.map((s, i) => {
        const drawn = themedSticker(s.name, theme, s.size)
        return (
          drawn && (
            <span
              key={`${scene}-${i}`}
              className="desktop__sticker"
              style={{ top: `${s.top}%`, left: `${s.left}%` } as CSSProperties}
            >
              <Sticker name={drawn.name} size={drawn.size} rotate={s.rotate} />
            </span>
          )
        )
      })}
      {TWINKLES.map((t, i) => (
        <span
          key={`tw-${i}`}
          className="twinkle"
          style={
            {
              top: `${t.top}%`,
              left: `${t.left}%`,
              '--twinkle-size': `${t.size}px`,
              '--twinkle-delay': `${t.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

/**
 * Chunky chrome bubble-letter wordmark with a "top secret" marquee under it. On Home it's the
 * full header; on every other tab CSS (`.app:not(.app--home) .brand`) slims it to a strip:
 * smaller wordmark, no side stickers, no marquee.
 */
export function Brand() {
  const variant = useTitleStyle()
  const theme = useStickerTheme()
  // The wide styles need the whole row, so they go without the side stickers.
  const wide = variant === 'cutout' || variant === 'pixel'
  const left = wide ? null : themedSticker('heart', theme, 34)
  const right = wide ? null : themedSticker('sparkle', theme, 30)
  return (
    <header className="brand" aria-hidden="true">
      <div className="brand__row">
        {left && <Sticker name={left.name} size={left.size} rotate={-14} className="brand__sticker brand__sticker--l" />}
        <BrandWord variant={variant} />
        {right && <Sticker name={right.name} size={right.size} rotate={12} className="brand__sticker brand__sticker--r" />}
      </div>
      <div className="marquee">
        <div className="marquee__track">
          {[0, 1].map((n) => (
            <span key={n} className="marquee__text">
              ★ TOP SECRET ★ KEEP OUT ★ PRIVATE DIARY ★ NO BOYS ALLOWED ★ XOXO ★ STAY HOT ★&nbsp;
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}
