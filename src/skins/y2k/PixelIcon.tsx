// Tiny hand-drawn pixel icons (original art) for title bars, the taskbar and dialogs.
// Each icon is a grid of characters; every character maps to a colour class (`px-<char>`)
// coloured from the design tokens in y2k.css. Purely decorative: always aria-hidden.

export type PixelIconName =
  | 'home'
  | 'calendar'
  | 'gear'
  | 'heart'
  | 'star'
  | 'floppy'
  | 'info'
  | 'error'
  | 'tomb'
  | 'check'
  | 'clock'
  | 'note'
  | 'egg'
  | 'chart'

const ICONS: Record<PixelIconName, readonly string[]> = {
  home: [
    '.....kk.....',
    '....kppk....',
    '...kpllpk...',
    '..kpllllpk..',
    '.kpllllllpk.',
    'kkkkkkkkkkkk',
    '.kwwwwwwwwk.',
    '.kwppwwbbwk.',
    '.kwppwwbbwk.',
    '.kwppwwwwwk.',
    '.kwppwwwwwk.',
    '.kkkkkkkkkk.',
  ],
  calendar: [
    '..k......k..',
    '.kkkkkkkkkk.',
    '.kppppppppk.',
    '.kppwwwwppk.',
    '.kkkkkkkkkk.',
    '.kwwwwwwwwk.',
    '.kwvwvwvwvk.',
    '.kwwwwwwwwk.',
    '.kwvwpwvwvk.',
    '.kwwwwwwwwk.',
    '.kwvwvwvwwk.',
    '.kkkkkkkkkk.',
  ],
  gear: [
    '.....kk.....',
    '..kk.kk.kk..',
    '..kvkvvkvk..',
    '...kvvvvk...',
    '.kkvvkkvvkk.',
    'kvvvk..kvvvk',
    'kvvvk..kvvvk',
    '.kkvvkkvvkk.',
    '...kvvvvk...',
    '..kvkvvkvk..',
    '..kk.kk.kk..',
    '.....kk.....',
  ],
  heart: [
    '.kkk...kkk.',
    'kpppk.kpppk',
    'kpwpppppppk',
    'kpwpppppppk',
    'kpppppppppk',
    '.kpppppppk.',
    '..kpppppk..',
    '...kpppk...',
    '....kpk....',
    '.....k.....',
  ],
  star: [
    '.....kk.....',
    '.....kk.....',
    '....kwlk....',
    '....kwlk....',
    'kkkkkwllkkkk',
    '.kwllllllllk',
    '..kllllllk..',
    '...kllllk...',
    '..kllkkllk..',
    '..klk..klk..',
    '.kk......kk.',
  ],
  floppy: [
    'kkkkkkkkkkk.',
    'kvkwwwwwkvk.',
    'kvkwwwwwkvkk',
    'kvkwwwwwkvvk',
    'kvkkkkkkkvvk',
    'kvvvvvvvvvvk',
    'kvvkkkkkkvvk',
    'kvvkwwwwkvvk',
    'kvvkwppwkvvk',
    'kvvkwwwwkvvk',
    'kkkkkkkkkkkk',
  ],
  info: [
    '...kkkkk...',
    '.kkbbbbbkk.',
    '.kbbbwbbbk.',
    'kbbbbbbbbbk',
    'kbbbwwbbbbk',
    'kbbbbwbbbbk',
    'kbbbbwbbbbk',
    '.kbbwwwbbk.',
    '.kkbbbbbkk.',
    '...kkbkkk..',
    '.....kk....',
  ],
  error: [
    '...kkkkk...',
    '.kkrrrrrkk.',
    '.krwrrrwrk.',
    'krrrwrwrrrk',
    'krrrrwrrrrk',
    'krrrwrwrrrk',
    '.krwrrrwrk.',
    '.kkrrrrrkk.',
    '...kkkkk...',
  ],
  tomb: [
    '...kkkkk...',
    '..kgggggk..',
    '.kgggkgggk.',
    '.kggkkkggk.',
    '.kgggkgggk.',
    '.kgggkgggk.',
    '.kgggggggk.',
    '.kgggggggk.',
    'kkkkkkkkkkk',
    'kmmmmmmmmmk',
    'kkkkkkkkkkk',
  ],
  check: [
    '.........kk',
    '........kmk',
    '.......kmk.',
    'kk....kmk..',
    'kmk..kmk...',
    '.kmkkmk....',
    '..kmmk.....',
    '...kk......',
  ],
  clock: [
    '...kkkkk...',
    '.kkwwwwwkk.',
    '.kwwwkwwwk.',
    'kwwwwkwwwwk',
    'kwwwwkwwwwk',
    'kwwwwkkkwwk',
    'kwwwwwwwwwk',
    '.kwwwwwwwk.',
    '.kkwwwwwkk.',
    '...kkkkk...',
  ],
  note: [
    'kkkkkkkkk..',
    'kwwwwwwwkk.',
    'kwvvvvvwkwk',
    'kwwwwwwwkkk',
    'kwvvvvvvvwk',
    'kwwwwwwwwwk',
    'kwvvvvvvvwk',
    'kwwwwwwwwwk',
    'kwvvvvwwwwk',
    'kwwwwwwwwwk',
    'kkkkkkkkkkk',
  ],
  egg: [
    '...kkkk...',
    '..kwwllk..',
    '.kwwllllk.',
    '.kwllpllk.',
    'kllllllllk',
    'klpllllplk',
    'klllllllllk',
    'kllllpllllk',
    '.kllllllk.',
    '..kkkkkk..',
  ],
  chart: [
    'k...........',
    'k........kkk',
    'k........kpk',
    'k....kkk.kpk',
    'k....kvk.kpk',
    'k....kvk.kpk',
    'kkkk.kvk.kpk',
    'kkbk.kvk.kpk',
    'kkbk.kvk.kpk',
    'kkbk.kvk.kpk',
    'kkbk.kvk.kpk',
    'kkkkkkkkkkkk',
  ],
}

interface Props {
  name: PixelIconName
  /** Rendered size of one icon pixel, in CSS px. */
  scale?: number
  className?: string
}

export function PixelIcon({ name, scale = 2, className }: Props) {
  const rows = ICONS[name]
  const width = Math.max(...rows.map((r) => r.length))
  const height = rows.length
  const rects: { x: number; y: number; w: number; c: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      if (c === '.') {
        x++
        continue
      }
      let run = 1
      while (row[x + run] === c) run++
      rects.push({ x, y, w: run, c })
      x += run
    }
  })
  return (
    <svg
      className={`pixel-icon${className ? ` ${className}` : ''}`}
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {rects.map((r, i) => (
        <rect key={i} className={`px-${r.c}`} x={r.x} y={r.y} width={r.w} height={1} />
      ))}
    </svg>
  )
}
