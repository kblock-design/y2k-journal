// Line icons for Gloss: 24×24 grid, 1.8 stroke, round joins. Decorative (aria-hidden);
// the button or text around each icon carries the meaning.

export type IconName =
  | 'home'
  | 'calendar'
  | 'stats'
  | 'settings'
  | 'plus'
  | 'check'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'drop'
  | 'key'
  | 'copy'
  | 'clock'
  | 'alert'
  | 'lock'
  | 'download'
  | 'upload'
  | 'sheet'
  | 'bell'
  | 'loop'
  | 'info'
  | 'type'
  | 'palette'
  | 'heart'

const PATHS: Record<IconName, string[]> = {
  home: ['M4 10.5 12 4l8 6.5', 'M6 9v10.2c0 .44.36.8.8.8h3.7v-5.5h3v5.5h3.7c.44 0 .8-.36.8-.8V9'],
  calendar: ['M5.5 6h13a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6Z', 'M4 10h16', 'M8.5 3.8v4', 'M15.5 3.8v4'],
  stats: ['M5 19.5V13', 'M10 19.5V5', 'M15 19.5v-9', 'M20 19.5V8'],
  settings: ['M4 7h8.6', 'M17.4 7H20', 'M4 17h2.6', 'M11.4 17H20', 'M4 12h11.4'],
  plus: ['M12 5v14', 'M5 12h14'],
  check: ['m5 12.5 4.5 4.5L19 7.5'],
  close: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
  'chevron-left': ['m14.5 6-6 6 6 6'],
  'chevron-right': ['m9.5 6 6 6-6 6'],
  'chevron-up': ['m6 14.5 6-6 6 6'],
  'chevron-down': ['m6 9.5 6 6 6-6'],
  drop: ['M12 3.5c3.2 4 5.5 7.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-3 2.3-6.2 5.5-10.2Z'],
  key: ['M14.5 4.5a5 5 0 1 1-3.6 8.45L5 18.8V20h3v-2h2v-2h1.6l.9-.9', 'M15.5 8.5h.01'],
  copy: ['M9 9h9.5a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5H10A1.5 1.5 0 0 1 8.5 19v-9', 'M15.5 5.5V5A1.5 1.5 0 0 0 14 3.5H5.5A1.5 1.5 0 0 0 4 5v8.5A1.5 1.5 0 0 0 5.5 15H6'],
  clock: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z', 'M12 7.5V12l3 2'],
  alert: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z', 'M12 7.5v5.5', 'M12 16.5h.01'],
  lock: ['M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5Z', 'M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5'],
  download: ['M12 4v11', 'm7.5 10.5 4.5 4.5 4.5-4.5', 'M5 19.5h14'],
  upload: ['M12 15V4', 'm7.5 8.5 4.5-4.5 4.5 4.5', 'M5 19.5h14'],
  sheet: ['M6.5 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z', 'M13.5 3.5v4h4', 'M8 12.5h8', 'M8 16h8', 'M12 11v7'],
  bell: ['M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5Z', 'M10 20.5h4'],
  loop: ['M19.5 12a7.5 7.5 0 1 1-2.2-5.3', 'M19.8 4.5v3.8H16'],
  info: ['M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z', 'M12 11v5.5', 'M12 7.6h.01'],
  type: ['M5.5 7V5.5h13V7', 'M12 5.5v13', 'M9 18.5h6'],
  heart: ['M12 19.5s-7.5-4.4-7.5-9.8A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.4c0 5.4-7.5 9.8-7.5 9.8Z'],
  palette: ['M12 3.5a8.5 8.5 0 0 0 0 17c1.1 0 1.8-.7 1.8-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6h2.1a4 4 0 0 0 4-4c0-4.1-3.8-7.5-8.5-7.5Z'],
}

/** Knobs on the settings sliders (filled circles). */
const DOTS: Partial<Record<IconName, [number, number][]>> = {
  settings: [
    [15, 7],
    [9, 17],
    [18, 12],
  ],
  palette: [
    [8, 12.5],
    [10, 8],
    [14.8, 8],
  ],
}

export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`gl-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {DOTS[name]?.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.1} fill="var(--gl-icon-knob, currentColor)" stroke="none" />
      ))}
    </svg>
  )
}
