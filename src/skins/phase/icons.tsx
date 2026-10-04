// Simple line icons drawn for this skin: 24×24, 2px round strokes in currentColor.
// Always decorative (aria-hidden); the control that holds one carries the accessible name.

const PATHS = {
  home: 'M4 10.6 12 4l8 6.6V19a1.2 1.2 0 0 1-1.2 1.2H15v-5.4H9v5.4H5.2A1.2 1.2 0 0 1 4 19z',
  calendar: 'M7 4.5h10a3.5 3.5 0 0 1 3.5 3.5v9a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V8A3.5 3.5 0 0 1 7 4.5zM3.5 10h17M8.5 2.8v3.4M15.5 2.8v3.4',
  stats: 'M6 19.5v-6M12 19.5V5M18 19.5v-9.5',
  settings: 'M4 7.5h8.5M18.5 7.5H20M4 16.5h2M12 16.5h8M15.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM9 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5 9.6 17 19 7.5',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  'chevron-left': 'M14.5 5.5 8 12l6.5 6.5',
  'chevron-right': 'M9.5 5.5 16 12l-6.5 6.5',
  'chevron-up': 'M5.5 14.5 12 8l6.5 6.5',
  copy: 'M10.5 8.5h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2',
  drop: 'M12 3.8c3.4 4 5.8 7.3 5.8 10.2a5.8 5.8 0 0 1-11.6 0c0-2.9 2.4-6.2 5.8-10.2z',
  heart: 'M12 19.5s-7.2-4.3-7.2-9.6A4 4 0 0 1 12 7.6a4 4 0 0 1 7.2 2.3c0 5.3-7.2 9.6-7.2 9.6z',
  pulse: 'M3.5 12.5h3.8l2.1-5 4.2 10 2.1-5h4.8',
  moon: 'M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.3 6.3 0 0 0 10.1 10.1z',
  bell: 'M6.5 16.5v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14zM10 20.8a2.2 2.2 0 0 0 4 0',
  loop: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4',
  download: 'M12 4.5v10M7.5 10.5l4.5 4.5 4.5-4.5M5 19.5h14',
  upload: 'M12 15.5v-10M7.5 9.5 12 5l4.5 4.5M5 19.5h14',
  sheet: 'M7 4.5h10A2.5 2.5 0 0 1 19.5 7v10a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5zM4.5 10h15M10 10v9.5',
  lock: 'M7.5 10.5h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5',
  sparkle: 'M12 3.5c.7 4.6 2.2 6.6 8.5 8.5-6.3 1.9-7.8 3.9-8.5 8.5-.7-4.6-2.2-6.6-8.5-8.5 6.3-1.9 7.8-3.9 8.5-8.5z',
  info: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 11v5.2M12 7.8v.1',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17zM12 7.5V12l3 2',
  palette: 'M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.6 0-1.3-1.2-1.6-1.2-2.8 0-1 .8-1.6 1.8-1.6h2.1a3 3 0 0 0 3-3c0-4.4-3.4-8-7.5-8zM8 12.5h.1M9.5 8h.1M14.5 8h.1',
  key: 'M7 7h.1M12 7h.1M17 7h.1M7 12h.1M12 12h.1M17 12h.1M7 17h.1M12 17h.1M17 17h.1',
  alert: 'M12 4 21 19.5H3zM12 10v4.2M12 16.8v.1',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`ph-icon${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'key' ? 3.2 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
