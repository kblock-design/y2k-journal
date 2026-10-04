// Original pixel-art creatures for the keychain pet. Everything here is plain data:
// each sprite is a grid of strings, one string per pixel row, where '#' is a lit LCD
// pixel and '.' is an unlit one. To tweak a pixel, flip a character; keep every row of a
// grid the same length (sprites.test.ts checks this, plus symmetry and overlaps).
//
// Layout of the sprite canvas (CANVAS_W x CANVAS_H pixels):
//   - the creature stands bottom-centred, its last row on FLOOR - 1 (one spare row below
//     so droopy poses can sink by a pixel);
//   - a 7x7 status badge (heart, rain cloud, skull, alarm) sits in the top-right corner
//     at BADGE_X, BADGE_Y.
// Faces are drawn separately (eyes + mouth) on top of the hollow bodies, so each stage
// only needs two body frames and each mood only needs one face per frame.

import type { PetHealth, PetStage } from '../../../logic/pet'

/** One string per pixel row: '#' = lit, anything else = off. All rows the same length. */
export type Grid = readonly string[]
export type Frames = readonly [Grid, Grid]

export const CANVAS_W = 28
export const CANVAS_H = 22
/** Creatures stand on this line: their bottom row is FLOOR - 1. */
export const FLOOR = 21
export const BADGE_X = 21
export const BADGE_Y = 0
/** Eye grids are drawn for the left eye in a box this wide; the right eye is its mirror. */
export const EYE_W = 4

// ---------------------------------------------------------------------------
// Bodies (two idle frames each). Frames share their top rows so the face stays put;
// a shorter frame B (e.g. the baby's squash) sinks because sprites are bottom-aligned.
// ---------------------------------------------------------------------------

export interface FaceAnchor {
  /** Left edge of the left eye box (right eye box mirrors it). */
  eyeX: number
  /** Top row of both eye boxes. */
  eyeY: number
  /** Top row of the (horizontally centred) mouth. */
  mouthY: number
}

export interface Creature {
  frames: Frames
  /** Where the face goes, in grid coordinates. Null: no face (the egg). */
  face: FaceAnchor | null
}

/** Speckled egg. Frame B: a little crack where the top speckle was. */
const EGG: Frames = [
  [
    '....####....',
    '...#....#...',
    '..#......#..',
    '..#.##...#..',
    '.#..##....#.',
    '.#........#.',
    '#.......##.#',
    '#.......##.#',
    '#..##......#',
    '#..##......#',
    '#..........#',
    '.#........#.',
    '..#......#..',
    '...######...',
  ],
  [
    '....####....',
    '...#....#...',
    '..#......#..',
    '..#..#.#.#..',
    '.#..#.#...#.',
    '.#........#.',
    '#.......##.#',
    '#.......##.#',
    '#..##......#',
    '#..##......#',
    '#..........#',
    '.#........#.',
    '..#......#..',
    '...######...',
  ],
]

/** Round blob with a hair curl. A: on its feet. B: squashed flat (it bounces). */
const BABY: Frames = [
  [
    '.......#......',
    '......#.......',
    '....######....',
    '..##......##..',
    '.#..........#.',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '.#..........#.',
    '..##########..',
    '...##....##...',
  ],
  [
    '.......#......',
    '......#.......',
    '....######....',
    '..##......##..',
    '.#..........#.',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '.############.',
  ],
]

/** Cat-eared bean with a tail. A: tail up, feet together. B: tail down, mid-step. */
const TEEN: Frames = [
  [
    '...#..........#...',
    '...##........##...',
    '...#.########.#...',
    '..#............#..',
    '..#............#.#',
    '..#............#.#',
    '..#............##.',
    '..#............#..',
    '..#............#..',
    '...#..........#...',
    '....##########....',
    '....#.#....#.#....',
    '....###....###....',
  ],
  [
    '...#..........#...',
    '...##........##...',
    '...#.########.#...',
    '..#............#..',
    '..#............#..',
    '..#............#..',
    '..#............#..',
    '..#............##.',
    '..#............#.#',
    '...#..........#..#',
    '....##########....',
    '....###....#.#....',
    '...........###....',
  ],
]

/** Big round buddy with a bow. A: arms up (cheering). B: arms down. */
const ADULT: Frames = [
  [
    '......##....##......',
    '.....#..#..#..#.....',
    '.....#...##...#.....',
    '.....#..#..#..#.....',
    '......########......',
    '....##........##....',
    '...#............#...',
    '..#..............#..',
    '#.#..............#.#',
    '##................##',
    '.#................#.',
    '.#................#.',
    '.#................#.',
    '.#................#.',
    '..#..............#..',
    '...#............#...',
    '....############....',
    '....#..#....#..#....',
    '....####....####....',
  ],
  [
    '......##....##......',
    '.....#..#..#..#.....',
    '.....#...##...#.....',
    '.....#..#..#..#.....',
    '......########......',
    '....##........##....',
    '...#............#...',
    '..#..............#..',
    '..#..............#..',
    '.#................#.',
    '.#................#.',
    '.#................#.',
    '.#................#.',
    '##................##',
    '#.#..............#.#',
    '...#............#...',
    '....############....',
    '....#..#....#..#....',
    '....####....####....',
  ],
]

export const CREATURES: Record<PetStage, Creature> = {
  egg: { frames: EGG, face: null },
  baby: { frames: BABY, face: { eyeX: 2, eyeY: 5, mouthY: 8 } },
  teen: { frames: TEEN, face: { eyeX: 4, eyeY: 4, mouthY: 7 } },
  adult: { frames: ADULT, face: { eyeX: 5, eyeY: 8, mouthY: 12 } },
}

// ---------------------------------------------------------------------------
// Dead: a little angel ghost with a halo and flapping wings (face baked in),
// or, for an egg, the egg under a halo.
// ---------------------------------------------------------------------------

export const GHOST: Frames = [
  [
    '......######......',
    '.....#......#.....',
    '......######......',
    '..................',
    '......######......',
    '....##......##....',
    '...#..........#...',
    '#..#..........#..#',
    '###............###',
    '..#.#..#..#..#.#..',
    '..#..##....##..#..',
    '..#............#..',
    '..#.....##.....#..',
    '..#............#..',
    '..#.##..##..##.#..',
    '..##..##..##..##..',
  ],
  [
    '......######......',
    '.....#......#.....',
    '......######......',
    '..................',
    '......######......',
    '....##......##....',
    '...#..........#...',
    '...#..........#...',
    '..#............#..',
    '..#.#..#..#..#.#..',
    '###..##....##..###',
    '#.#............#.#',
    '..#.....##.....#..',
    '..#............#..',
    '..##..##..##..##..',
    '....##..##..##....',
  ],
]

const HALO_12: Grid = ['...######...', '..#......#..', '...######...', '............']
const DEAD_EGG_GRID: Grid = [...HALO_12, ...EGG[1]]
export const DEAD_EGG: Frames = [DEAD_EGG_GRID, DEAD_EGG_GRID]

// ---------------------------------------------------------------------------
// Faces. Eyes are drawn for the LEFT eye in a 4-wide box; the right eye is mirrored.
// Mouths are centred, so keep their width even.
// ---------------------------------------------------------------------------

export const EYES = {
  open: ['.##.', '.##.'],
  /** ^ ^ smiling eyes */
  happy: ['.##.', '#..#'],
  /** heavy lid over a low pupil, tear just below */
  droopTearHigh: ['....', '####', '.##.', '.#..'],
  droopTearLow: ['....', '####', '.##.', '....', '.#..'],
  /** > <  squeezed */
  squeeze: ['.#..', '..#.', '.#..'],
  /** o o  dazed */
  dazed: ['.##.', '#..#', '.##.'],
  /** - -  closed and sagging */
  closedLow: ['....', '....', '####'],
} as const satisfies Record<string, Grid>

export const MOUTHS = {
  smile: ['#..#', '.##.'],
  grin: ['####', '.##.'],
  frown: ['.##.', '#..#'],
  wavyA: ['.#..#.', '#.##.#'],
  wavyB: ['#.##.#', '.#..#.'],
  flat: ['....', '####'],
} as const satisfies Record<string, Grid>

export interface Face {
  eyes: Grid
  mouth: Grid
}

type LivingHealth = Exclude<PetHealth, 'dead'>

/** Face per mood, for frame A and frame B. */
export const FACES: Record<LivingHealth, readonly [Face, Face]> = {
  happy: [
    { eyes: EYES.happy, mouth: MOUTHS.grin },
    { eyes: EYES.open, mouth: MOUTHS.smile },
  ],
  sad: [
    { eyes: EYES.droopTearHigh, mouth: MOUTHS.frown },
    { eyes: EYES.droopTearLow, mouth: MOUTHS.frown },
  ],
  sick: [
    { eyes: EYES.squeeze, mouth: MOUTHS.wavyA },
    { eyes: EYES.squeeze, mouth: MOUTHS.wavyB },
  ],
  critical: [
    { eyes: EYES.dazed, mouth: MOUTHS.flat },
    { eyes: EYES.closedLow, mouth: MOUTHS.flat },
  ],
}

// ---------------------------------------------------------------------------
// Status badges (7x7, top-right of the canvas), two frames each.
// ---------------------------------------------------------------------------

const BLANK_7: Grid = ['.......', '.......', '.......', '.......', '.......', '.......', '.......']

const HEART_6: Grid = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']
const SKULL_6: Grid = ['.#####.', '#######', '#..#..#', '###.###', '.#####.', '.#.#.#.']

export const BADGES: Record<LivingHealth, Frames> = {
  /** heart that bobs */
  happy: [[...HEART_6, '.......'], ['.......', ...HEART_6]],
  /** rain cloud, drops falling */
  sad: [
    ['..##...', '.#..##.', '#.....#', '.#####.', '.#...#.', '.......', '...#...'],
    ['..##...', '.#..##.', '#.....#', '.#####.', '...#...', '.#...#.', '.......'],
  ],
  /** the classic "sick" skull, bobbing */
  sick: [[...SKULL_6, '.......'], ['.......', ...SKULL_6]],
  /** flashing warning sign */
  critical: [['...#...', '..###..', '..#.#..', '.##.##.', '.#####.', '###.###', '#######'], BLANK_7],
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/** SVG path data for a grid, one `h`-run per horizontal stretch of lit pixels. */
export function gridPath(grid: Grid, ox = 0, oy = 0, mirror = false): string {
  let d = ''
  grid.forEach((source, y) => {
    const row = mirror ? [...source].reverse().join('') : source
    let x = 0
    while (x < row.length) {
      if (row[x] !== '#') {
        x++
        continue
      }
      const start = x
      while (x < row.length && row[x] === '#') x++
      d += `M${ox + start} ${oy + y}h${x - start}v1h${start - x}z`
    }
  })
  return d
}

export interface Layer {
  grid: Grid
  x: number
  y: number
  mirror?: boolean
}

/** Every layer (body, eyes, mouth) that makes up one frame of a creature, in canvas coordinates. */
export function frameLayers(stage: PetStage, health: PetHealth, frame: 0 | 1): Layer[] {
  if (health === 'dead') {
    const grid = (stage === 'egg' ? DEAD_EGG : GHOST)[frame]
    return [{ grid, x: (CANVAS_W - grid[0].length) / 2, y: FLOOR - grid.length }]
  }
  const creature = CREATURES[stage]
  const body = creature.frames[frame]
  const w = body[0].length
  const x = (CANVAS_W - w) / 2
  const y = FLOOR - body.length
  const layers: Layer[] = [{ grid: body, x, y }]
  if (creature.face) {
    const { eyeX, eyeY, mouthY } = creature.face
    const face = FACES[health][frame]
    layers.push(
      { grid: face.eyes, x: x + eyeX, y: y + eyeY },
      { grid: face.eyes, x: x + w - eyeX - EYE_W, y: y + eyeY, mirror: true },
      { grid: face.mouth, x: x + (w - face.mouth[0].length) / 2, y: y + mouthY },
    )
  }
  return layers
}

export function badgeLayer(stage: PetStage, health: PetHealth, frame: 0 | 1): Layer | null {
  if (health === 'dead') return null
  // A content egg just sits there; any trouble still shows its badge.
  if (stage === 'egg' && health === 'happy') return null
  return { grid: BADGES[health][frame], x: BADGE_X, y: BADGE_Y }
}

export function layersPath(layers: readonly Layer[]): string {
  return layers.map((l) => gridPath(l.grid, l.x, l.y, l.mirror)).join('')
}

// ---------------------------------------------------------------------------
// Small LCD status icons for the device's icon bars.
// ---------------------------------------------------------------------------

export const LCD_ICONS = {
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  star: ['..#..', '.###.', '#####', '.###.', '.#.#.'],
  bell: ['..#..', '.###.', '.###.', '#####', '..#..'],
} as const satisfies Record<string, Grid>
