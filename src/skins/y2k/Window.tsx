import { useId, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { PixelIcon } from './PixelIcon'
import type { PixelIconName } from './PixelIcon'
import { useStickerTheme } from './prefs'
import { themedSticker } from './stickerThemes'
import { Sticker } from './stickers'
import type { StickerName } from './stickers'

/**
 * Title bar finish. black (default): black-to-charcoal; chrome: liquid silver; hot: hot pink;
 * holo: holographic foil; error: red. The older names still work and map onto the new set
 * (pink → black, lilac → holo, blue and pastel → chrome).
 */
export type WindowTone = 'black' | 'chrome' | 'hot' | 'holo' | 'error' | 'pink' | 'lilac' | 'blue' | 'pastel'

/** A sticker slapped onto one corner of a window, hanging off the frame. */
export interface CornerSticker {
  name: StickerName
  corner: 'tl' | 'tr' | 'bl' | 'br'
  size?: number
  rotate?: number
}

/** Makes the window a disclosure: its title bar becomes a button that shows/hides the body. */
export interface Collapsible {
  defaultOpen: boolean
  /** Short text shown after the title while collapsed (e.g. the current choice). */
  summary?: ReactNode
}

interface Props {
  /** Title bar text. Decorative by default; pass `titleAs` to make it the section's heading. */
  title: ReactNode
  titleAs?: 'h2' | 'h3'
  titleId?: string
  icon?: PixelIconName
  tone?: WindowTone
  /** Fake menu bar items ("File", "Edit"…). Decorative. */
  menu?: readonly string[]
  /** Status bar text. Decorative. */
  status?: ReactNode
  stickers?: readonly CornerSticker[]
  /** Slight scrapbook tilt in degrees. */
  tilt?: number
  collapsible?: Collapsible
  as?: 'section' | 'div' | 'aside'
  className?: string
  bodyClassName?: string
  /** Extra attributes for the outer element. */
  ariaLabel?: string
  ariaLive?: 'polite'
  children: ReactNode
}

/** Retro desktop window: bevelled frame, gradient title bar with _ □ × , optional menu and status bars. */
export function Window(props: Props) {
  const {
    title,
    titleAs,
    titleId,
    icon,
    tone = 'black',
    menu,
    status,
    stickers,
    tilt,
    collapsible,
    as: Tag = 'section',
    className,
    bodyClassName,
    ariaLabel,
    ariaLive,
    children,
  } = props
  const bodyId = useId()
  const [open, setOpen] = useState(collapsible?.defaultOpen ?? true)
  const collapsed = !!collapsible && !open
  const style = tilt ? ({ '--tilt': `${tilt}deg` } as CSSProperties) : undefined
  // Corner stickers name a slot; the sticker theme picks what's drawn there. With no stickers
  // nothing is rendered, so the title/status padding reserved for corner stickers goes too.
  // A collapsed window is just its title bar, so bottom-corner stickers would sit on it: drop them.
  const theme = useStickerTheme()
  const corners = (stickers ?? []).flatMap((s) => {
    if (collapsed && (s.corner === 'bl' || s.corner === 'br')) return []
    const drawn = themedSticker(s.name, theme, s.size ?? 48)
    return drawn ? [{ ...s, ...drawn }] : []
  })
  const classes = [
    'win',
    `win--${tone}`,
    tilt ? 'win--tilted' : '',
    collapsible ? 'win--collapsible' : '',
    collapsed ? 'win--collapsed' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  let titlebar: ReactNode
  if (collapsible) {
    // Disclosure pattern: the heading holds one button that spans the whole title bar.
    const Heading = titleAs ?? 'div'
    titlebar = (
      <div className="win__titlebar win__titlebar--toggle">
        <Heading className="win__title" id={titleId}>
          <button
            type="button"
            className="win__toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((o) => !o)}
          >
            {icon && <PixelIcon name={icon} className="win__icon" />}
            <span className="win__toggle-text">
              <span className="win__title-text">{title}</span>
              {collapsed && collapsible.summary && <span className="win__summary">— {collapsible.summary}</span>}
            </span>
            <span className="win__ctl win__ctl--toggle" aria-hidden="true" />
          </button>
        </Heading>
      </div>
    )
  } else {
    const TitleTag = titleAs ?? 'span'
    titlebar = (
      <div className="win__titlebar">
        {icon && <PixelIcon name={icon} className="win__icon" />}
        <TitleTag className="win__title" id={titleId} aria-hidden={titleAs ? undefined : true}>
          {title}
        </TitleTag>
        <WindowControls />
      </div>
    )
  }

  return (
    <Tag className={classes} style={style} aria-label={ariaLabel} aria-live={ariaLive}>
      {titlebar}
      {menu && !collapsed && <MenuBar items={menu} />}
      <div id={bodyId} className={`win__body${bodyClassName ? ` ${bodyClassName}` : ''}`} hidden={collapsed}>
        {children}
      </div>
      {status && !collapsed && (
        <div className="win__status" aria-hidden="true">
          <span className="win__status-cell">{status}</span>
          <span className="win__status-grip" />
        </div>
      )}
      {corners.length > 0 && (
        <div className="win__stickers" aria-hidden="true">
          {corners.map((s, i) => (
            <span key={i} className={`win__sticker win__sticker--${s.corner}`}>
              <Sticker name={s.name} size={s.size} rotate={s.rotate} />
            </span>
          ))}
        </div>
      )}
    </Tag>
  )
}

/** The decorative minimise / maximise / close trio. */
export function WindowControls() {
  return (
    <span className="win__controls" aria-hidden="true">
      <span className="win__ctl win__ctl--min" />
      <span className="win__ctl win__ctl--max" />
      <span className="win__ctl win__ctl--close" />
    </span>
  )
}

/** Fake menu bar with the first letter underlined, like an old app. */
export function MenuBar({ items }: { items: readonly string[] }) {
  return (
    <div className="win__menu" aria-hidden="true">
      {items.map((m) => (
        <span key={m} className="win__menu-item">
          <u>{m.charAt(0)}</u>
          {m.slice(1)}
        </span>
      ))}
    </div>
  )
}
