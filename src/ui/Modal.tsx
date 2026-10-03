import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  /** Omit to make the dialog undismissable (no close button, no backdrop, no Escape). */
  onClose?: () => void
  /** 'full' covers the screen; 'sheet' slides up from the bottom. */
  variant: 'full' | 'sheet'
  className?: string
  footer?: ReactNode
  children: ReactNode
}

export function Modal({ title, onClose, variant, className, footer, children }: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Move focus into the dialog so screen readers announce it.
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className={`modal modal--${variant}${onClose ? '' : ' modal--blocking'}`}
      onClick={(e) => {
        if (onClose && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`modal__panel${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="modal__header">
          <h2 className="modal__title" id={titleId}>
            {title}
          </h2>
          {onClose && (
            <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
              ✕
            </button>
          )}
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  )
}
