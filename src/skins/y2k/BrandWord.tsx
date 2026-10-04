import type { TitleStyle } from './prefs'

// The app's wordmark, in a few interchangeable looks (picked in Settings; see prefs.ts).

function CutLetters({ text, small }: { text: string; small?: boolean }) {
  return (
    <span className={`cut-word${small ? ' cut-word--small' : ''}`}>
      {[...text].map((ch, i) => (
        <span key={i} className="cut">
          {ch}
        </span>
      ))}
    </span>
  )
}

export function BrandWord({ variant }: { variant: TitleStyle }) {
  const className = `brand__word brand__word--${variant}`
  switch (variant) {
    case 'cutout':
      return (
        <p className={className}>
          <CutLetters text="the" small />
          <CutLetters text="Burn" />
          <CutLetters text="Book" />
        </p>
      )
    case 'pixel':
      return (
        <p className={className}>
          C:\&gt; the_burn_book
          <span className="brand__cursor" />
        </p>
      )
    case 'chrome':
      return (
        <p className={className}>
          <span className="brand__the">the</span> Burn Book
        </p>
      )
    default:
      return (
        <p className={className}>
          <span className="brand__small">the</span> Burn Book
        </p>
      )
  }
}
