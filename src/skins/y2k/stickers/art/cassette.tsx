import { DieCut } from '../parts'
import { keys, sparklePath, type ArtProps } from '../svg'

const LABEL_HEART =
  'M22.5 36 C 20 34.2, 18.6 32.8, 18.6 31.4 C 18.6 30.2, 19.5 29.4, 20.5 29.4 ' +
  'C 21.4 29.4, 22.1 30, 22.5 30.8 C 22.9 30, 23.6 29.4, 24.5 29.4 C 25.5 29.4, 26.4 30.2, 26.4 31.4 ' +
  'C 26.4 32.8, 25 34.2, 22.5 36 Z'
const LABEL_STAR = sparklePath(77.5, 32.5, 4.4, 0.12, 0.3)

/** Pink mixtape cassette with a lilac label stripe. */
export function Cassette({ id }: ArtProps) {
  const k = keys(id)
  return (
    <>
      <defs>
        <linearGradient id={k.id('shell')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb8dc" />
          <stop offset="0.55" stopColor="#ff6fb7" />
          <stop offset="1" stopColor="#f2479b" />
        </linearGradient>
      </defs>
      <DieCut>
        <rect x="8" y="10" width="84" height="52" rx="5" />
      </DieCut>
      <rect x="8" y="10" width="84" height="52" rx="5" fill={k.url('shell')} stroke="#c8327f" strokeWidth={1} />
      <rect x="10.5" y="12.5" width="79" height="47" rx="3.5" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.8} />
      <g fill="#d2448f">
        <circle cx="12.5" cy="14.5" r="1.5" />
        <circle cx="87.5" cy="14.5" r="1.5" />
        <circle cx="12.5" cy="57.5" r="1.5" />
        <circle cx="87.5" cy="57.5" r="1.5" />
      </g>

      {/* label */}
      <rect x="15" y="15" width="70" height="29" rx="3" fill="#fff5fb" />
      <path d="M15 22.5 V18 Q15 15 18 15 H82 Q85 15 85 18 V22.5 Z" fill="#c7a3ff" />
      <path d="M20 18.8 H38 M44 18.8 H52" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" />
      <path d="M19 41 H81" stroke="#ffb3d9" strokeWidth={0.8} />
      <path d={LABEL_HEART} fill="#ff4fa3" />
      <path d={LABEL_STAR} fill="#b58cff" />

      {/* window + reels */}
      <rect x="30" y="26" width="40" height="13" rx="6.5" fill="#3b1235" />
      <circle cx="40" cy="32.5" r="5.8" fill="#7a3557" />
      <circle cx="60" cy="32.5" r="4.4" fill="#7a3557" />
      <g fill="#ffe6f3">
        <circle cx="40" cy="32.5" r="4" />
        <circle cx="60" cy="32.5" r="4" />
      </g>
      <g fill="none" stroke="#ff7ab9" strokeWidth={0.8} strokeDasharray="1.2 1.2">
        <circle cx="40" cy="32.5" r="2.9" />
        <circle cx="60" cy="32.5" r="2.9" />
      </g>
      <g fill="#3b1235">
        <circle cx="40" cy="32.5" r="1.6" />
        <circle cx="60" cy="32.5" r="1.6" />
      </g>
      <path d="M34 28.4 H50" stroke="#fff" strokeOpacity={0.5} strokeWidth={1.1} strokeLinecap="round" />

      {/* bottom tab */}
      <path d="M28 62 L31.5 49.5 H68.5 L72 62 Z" fill="#ec4b9b" stroke="#c8327f" strokeWidth={0.8} strokeLinejoin="round" />
      <g fill="#7a2253">
        <circle cx="37" cy="56.5" r="2" />
        <circle cx="63" cy="56.5" r="2" />
        <rect x="45" y="54.5" width="3" height="3" rx="0.5" fillOpacity={0.8} />
        <rect x="52" y="54.5" width="3" height="3" rx="0.5" fillOpacity={0.8} />
      </g>

      {/* plastic sheen */}
      <path d="M8 34 L32 10 H44 L8 46 Z" fill="#fff" fillOpacity={0.18} />
    </>
  )
}

Cassette.viewBox = [0, 0, 100, 72] as const
