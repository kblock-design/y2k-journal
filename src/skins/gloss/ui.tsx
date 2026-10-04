import { useId } from 'react'
import type { ReactNode } from 'react'
import { errorMessage } from '../../core/format'
import { Icon } from './icons'

/** The in-app wordmark: "Gloss" in liquid chrome with a small hot-pink glint. */
export function Wordmark({ as: Tag = 'p' }: { as?: 'p' | 'h1' }) {
  return (
    <Tag className="gl-wordmark">
      <span className="gl-wordmark__text">Gloss</span>
      <svg className="gl-wordmark__glint" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={SPARKLE} />
      </svg>
    </Tag>
  )
}

/** Four-point sparkle in a 24×24 box. */
const SPARKLE = 'M12 2C12.8 8 16 11.2 22 12 16 12.8 12.8 16 12 22 11.2 16 8 12.8 2 12 8 11.2 11.2 8 12 2Z'

/**
 * A rubber-stamp mark: a double-ruled box with one word, inked in --stamp (currentColor) with a speckled
 * texture (SVG turbulence). Exposed as an image named by `label` (or hidden when none).
 */
export function Stamp({ word, label, className }: { word: string; label?: string; className?: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const ink = `gl-ink-${raw}`
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const }
  return (
    <svg className={`gl-stamp${className ? ` ${className}` : ''}`} viewBox="0 0 132 56" focusable="false" {...a11y}>
      <defs>
        <filter id={ink} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 2.15" result="speckle" />
          <feComposite in="SourceGraphic" in2="speckle" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${ink})`} fill="none" stroke="currentColor">
        <rect x="3" y="3" width="126" height="50" rx="9" strokeWidth={3.2} />
        <rect x="8.5" y="8.5" width="115" height="39" rx="5" strokeWidth={1.2} />
        <text
          x="66"
          y="36.5"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontFamily="Outfit, system-ui, sans-serif"
          fontSize="21"
          fontWeight="800"
          letterSpacing="2.5"
        >
          {word}
        </text>
      </g>
    </svg>
  )
}

/** VT323 can't be trusted with U+2212 or ≈: keep LCD text to plain ASCII. */
function lcdSafe(text: string): string {
  return text.replace(/−/g, '-').replace(/≈/g, '~')
}

/**
 * A recessed LCD readout with unlit "8" segments ghosted behind the digits. Decorative copy
 * of a number: always pair it with readable text for assistive tech (`spoken`).
 */
export function Lcd({
  value,
  label,
  unit,
  size = 'md',
  spoken,
  className,
}: {
  value: string
  label?: string
  unit?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  spoken?: string
  className?: string
}) {
  const v = lcdSafe(value)
  return (
    <span className={`gl-lcd gl-lcd--${size}${className ? ` ${className}` : ''}`}>
      <span className="gl-lcd__face" aria-hidden="true">
        {label && <span className="gl-lcd__label">{label}</span>}
        <span className="gl-lcd__digits">
          <span className="gl-lcd__ghost">{v.replace(/[0-9]/g, '8')}</span>
          <span className="gl-lcd__value">{v}</span>
        </span>
        {unit && <span className="gl-lcd__unit">{unit}</span>}
      </span>
      {spoken && <span className="visually-hidden">{spoken}</span>}
    </span>
  )
}

/** Small holographic chip: used only for provisional things ("estimate", "early look"). */
export function HoloChip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="gl-holo-chip" title={title}>
      {children}
    </span>
  )
}

/** Silkscreen micro-label. */
export function Kicker({ children, as: Tag = 'p', id }: { children: ReactNode; as?: 'p' | 'h2' | 'h3' | 'span'; id?: string }) {
  return (
    <Tag className="gl-kicker" id={id}>
      {children}
    </Tag>
  )
}

/** A card's fallback after a render error: what broke and a retry. */
export function SectionError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <div className="gl-card gl-error" role="alert">
      <span className="gl-error__icon" aria-hidden="true">
        <Icon name="alert" size={20} />
      </span>
      <div className="gl-error__body">
        <p className="gl-error__title">{title}</p>
        <p className="gl-error__msg">{errorMessage(error)}</p>
        <button type="button" className="gl-btn gl-btn--chrome gl-btn--sm" onClick={onRetry}>
          Try again
        </button>
      </div>
    </div>
  )
}

/** Whole-page message (load failure, crash) with actions. */
export function PageMessage({ title, message, children }: { title: string; message?: string; children?: ReactNode }) {
  const id = useId()
  return (
    <div className="gl-page-msg" role="alert" aria-labelledby={id}>
      <Wordmark />
      <div className="gl-card gl-page-msg__card">
        <h1 id={id} className="gl-page-msg__title">
          {title}
        </h1>
        {message && <p className="gl-page-msg__text">{message}</p>}
        <p className="gl-page-msg__text">Your entries are safe on this phone.</p>
        <div className="gl-page-msg__actions">{children}</div>
      </div>
    </div>
  )
}

/** Status line under a group of controls. Always mounted so screen readers catch updates. */
export function StatusLine({ status }: { status: { kind: 'ok' | 'error'; text: string } | null }) {
  return (
    <p className={`gl-status${status ? ` gl-status--${status.kind}` : ''}`} role="status">
      {status && (
        <>
          <Icon name={status.kind === 'ok' ? 'check' : 'alert'} size={16} />
          <span>{status.text}</span>
        </>
      )}
    </p>
  )
}
