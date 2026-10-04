import { useId, type CSSProperties, type JSX } from 'react'
import type { StickerName } from './names'
import { ART } from './registry'
import './stickers.css'

export type StickerProps = {
  name: StickerName
  /** Width in px; height follows the sticker's aspect ratio. Default 48. */
  size?: number
  /** Degrees, applied as an inline style transform. Default 0. */
  rotate?: number
  className?: string
}

/** One decorative die-cut sticker as an inline SVG. */
export function Sticker({ name, size = 48, rotate = 0, className }: StickerProps): JSX.Element {
  // useId() can contain characters (":", "«", "»") that are awkward inside url(#...).
  const uid = 'stk' + useId().replace(/[^A-Za-z0-9_-]/g, '')
  const Art = ART[name] ?? ART.heart
  const { viewBox } = Art
  const [, , vbW, vbH] = viewBox
  const height = Math.round(((size * vbH) / vbW) * 100) / 100

  const style: CSSProperties = { pointerEvents: 'none' }
  if (rotate) style.transform = `rotate(${rotate}deg)`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`sticker sticker--${name}${className ? ` ${className}` : ''}`}
      viewBox={viewBox.join(' ')}
      width={size}
      height={height}
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      <Art id={uid} />
    </svg>
  )
}
