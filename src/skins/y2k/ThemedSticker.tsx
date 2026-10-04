import { useStickerTheme } from './prefs'
import { themedSticker } from './stickerThemes'
import { Sticker } from './stickers'
import type { StickerProps } from './stickers'

/** A sticker placed by slot name; the current sticker theme decides what's drawn (or nothing). */
export function ThemedSticker({ name, size = 48, ...rest }: StickerProps) {
  const drawn = themedSticker(name, useStickerTheme(), size)
  return drawn ? <Sticker {...rest} name={drawn.name} size={drawn.size} /> : null
}
