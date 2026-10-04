import { LCD_ICONS, gridPath } from './sprites'
import './pet.css'

export type LcdIconName = keyof typeof LCD_ICONS

interface Props {
  name: LcdIconName
  /** Unlit icons show faintly, like inactive segments on a real LCD. */
  lit?: boolean
  /** CSS px per icon pixel. */
  scale?: number
  className?: string
}

/** Tiny monochrome LCD icon in `currentColor`. Decorative. */
export function LcdIcon({ name, lit = true, scale = 2, className }: Props) {
  const grid = LCD_ICONS[name]
  const w = grid[0].length
  const h = grid.length
  return (
    <svg
      className={`tama-icon${lit ? '' : ' tama-icon--off'}${className ? ` ${className}` : ''}`}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={gridPath(grid)} />
    </svg>
  )
}
