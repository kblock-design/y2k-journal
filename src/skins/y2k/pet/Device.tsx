import type { PetHealth, PetStatus } from '../../../logic/pet'
import { LcdIcon } from './LcdIcon'
import { PetSprite } from './PetSprite'
import './pet.css'

// The keychain toy itself: glitter-pink egg shell, ball chain + charms, chrome bezel,
// LCD with icon bars, three rubber buttons. Entirely decorative (aria-hidden); PetView
// prints the same facts as real text beside it.

/** Hearts lit on the LCD meter (out of 4). */
const HEARTS: Record<PetHealth, number> = {
  happy: 4,
  sad: 3,
  sick: 2,
  critical: 1,
  dead: 0,
}

/** Ball-chain loop: beads around an ellipse that runs through the ring and the shell's tab. */
const BEADS = Array.from({ length: 18 }, (_, i) => {
  const t = (i / 18) * Math.PI * 2
  return { cx: +(40 + 5 * Math.sin(t)).toFixed(2), cy: +(18 - 10 * Math.cos(t)).toFixed(2) }
})

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

const HEART_PATH =
  'M5.5 10C2.5 7.6 0 5.6 0 3.1 0 1.3 1.4 0 3.1 0 4.2 0 5 .6 5.5 1.5 6 .6 6.8 0 7.9 0 9.6 0 11 1.3 11 3.1 11 5.6 8.5 7.6 5.5 10Z'

function Keychain() {
  return (
    <svg className="tama__chain" width="80" height="38" viewBox="0 0 80 38" focusable="false">
      {/* split ring */}
      <circle cx="40" cy="7" r="6" fill="none" stroke="#8d88a3" strokeWidth="2.4" />
      <circle cx="40" cy="7" r="6" fill="none" stroke="#f4f2fb" strokeWidth="0.9" strokeDasharray="7 4 12 30" />
      {/* ball chain */}
      {BEADS.map((b, i) => (
        <circle key={i} cx={b.cx} cy={b.cy} r="1.35" fill="#e6e3f0" stroke="#8d88a3" strokeWidth="0.45" />
      ))}
      {/* heart charm */}
      <g className="tama__charm tama__charm--heart">
        <path d="M34.5 12 28 15.6" stroke="#8d88a3" strokeWidth="1" />
        <circle cx="34.5" cy="12" r="1.6" fill="none" stroke="#8d88a3" strokeWidth="0.9" />
        <g transform="translate(22.5 15) rotate(-8 5.5 5)">
          <path d={HEART_PATH} fill="#ff4fae" stroke="#a60f63" strokeWidth="0.8" />
          <ellipse cx="3.2" cy="2.8" rx="1.4" ry="0.9" fill="#fff" opacity="0.85" />
        </g>
      </g>
      {/* star charm */}
      <g className="tama__charm tama__charm--star">
        <path d="M45.5 12 51.5 14.6" stroke="#8d88a3" strokeWidth="1" />
        <circle cx="45.5" cy="12" r="1.6" fill="none" stroke="#8d88a3" strokeWidth="0.9" />
        <polygon points={starPoints(52.5, 20.5, 6, 2.6)} fill="#d6c4ff" stroke="#7d5fd0" strokeWidth="0.8" />
        <polygon points={starPoints(51.6, 19.6, 2.4, 1)} fill="#fff" opacity="0.8" />
      </g>
    </svg>
  )
}

/** Rhinestones and star decals on the shell: [left, top, size] in px on the 160x188 shell. */
const GEMS: readonly (readonly [number, number, number])[] = [
  [67, 11, 5],
  [76, 8, 8],
  [88, 11, 5],
  [12, 62, 7],
  [141, 62, 7],
  [11, 124, 5],
  [144, 124, 5],
]
const STARS: readonly (readonly [number, number, number, number])[] = [
  // left, top, size, rotation
  [9, 92, 15, -14],
  [138, 98, 11, 12],
  [24, 140, 8, 20],
]

export function PetDevice({ status }: { status: PetStatus }) {
  const hearts = HEARTS[status.health]
  const alarm = status.health === 'sick' || status.health === 'critical'
  return (
    <div className="tama__device" aria-hidden="true">
      <Keychain />
      <div className="tama__shell">
        {GEMS.map(([left, top, size], i) => (
          <span key={`g${i}`} className="tama__gem" style={{ left, top, width: size, height: size }} />
        ))}
        {STARS.map(([left, top, size, rot], i) => (
          <span
            key={`s${i}`}
            className="tama__decal"
            style={{ left, top, width: size, height: size, transform: `rotate(${rot}deg)` }}
          />
        ))}
        <div className="tama__bezel">
          <div className="tama__lcd">
            <div className="tama__lcd-row">
              <span className="tama__hearts">
                {[0, 1, 2, 3].map((i) => (
                  <LcdIcon key={i} name="heart" lit={i < hearts} />
                ))}
              </span>
              <LcdIcon name="bell" lit={alarm} className={alarm ? 'tama__alarm' : undefined} />
            </div>
            <PetSprite stage={status.stage} health={status.health} size={84} />
            <div className="tama__lcd-row">
              <span className="tama__readout">
                <LcdIcon name="star" lit={status.streak > 0} />
                {String(status.streak).padStart(2, '0')}
              </span>
              <span className="tama__readout">AGE {status.ageDays}</span>
            </div>
          </div>
        </div>
        <span className="tama__brand">burn buddy</span>
        <span className="tama__buttons">
          <span className="tama__button" />
          <span className="tama__button" />
          <span className="tama__button" />
        </span>
      </div>
    </div>
  )
}
