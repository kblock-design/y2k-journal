import { useMemo } from 'react'
import type { PetHealth, PetStage } from '../../../logic/pet'
import { CANVAS_H, CANVAS_W, badgeLayer, frameLayers, gridPath, layersPath } from './sprites'
import './pet.css'

interface Props {
  stage: PetStage
  health: PetHealth
  /** Rendered width in CSS px (height follows the 28x22 canvas). Multiples of 28 stay pixel-crisp. */
  size?: number
}

/**
 * LCD-style pixel creature, drawn in `currentColor` so it can sit on the keychain's screen,
 * the hatch screen or a graveyard card. Two frames swap via CSS (pet.css); with reduced
 * motion only frame A shows. Decorative: callers provide the words.
 */
export function PetSprite({ stage, health, size = 84 }: Props) {
  const paths = useMemo(() => {
    const badgeA = badgeLayer(stage, health, 0)
    const badgeB = badgeLayer(stage, health, 1)
    return {
      a: layersPath(frameLayers(stage, health, 0)),
      b: layersPath(frameLayers(stage, health, 1)),
      badgeA: badgeA ? gridPath(badgeA.grid, badgeA.x, badgeA.y) : '',
      badgeB: badgeB ? gridPath(badgeB.grid, badgeB.x, badgeB.y) : '',
    }
  }, [stage, health])

  return (
    <svg
      className={`tama-sprite tama-sprite--${health} tama-sprite--${stage}`}
      width={size}
      height={(size * CANVAS_H) / CANVAS_W}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <g className="tama-sprite__pose">
        <g className="tama-sprite__move">
          <path className="tama-sprite__frame tama-sprite__frame--a" d={paths.a} />
          <path className="tama-sprite__frame tama-sprite__frame--b" d={paths.b} />
        </g>
      </g>
      {paths.badgeA && (
        <g className="tama-sprite__badge">
          <path className="tama-sprite__frame tama-sprite__frame--a" d={paths.badgeA} />
          {paths.badgeB && <path className="tama-sprite__frame tama-sprite__frame--b" d={paths.badgeB} />}
        </g>
      )}
    </svg>
  )
}
