import type { ReactNode } from 'react'
import { useDialog } from '../../core/useDialog'
import { PixelIcon } from './PixelIcon'
import { RhinestoneRow } from './stickers'

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
  const { titleId, panelRef } = useDialog(onClose)

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
          <PixelIcon name="note" className="modal__icon" />
          <h2 className="modal__title" id={titleId}>
            {title}
          </h2>
          {onClose && (
            <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
              <span className="modal__close-x" aria-hidden="true" />
            </button>
          )}
        </header>
        <div className="modal__body">{children}</div>
        {footer && (
          <footer className="modal__footer">
            <RhinestoneRow count={12} className="modal__gems" />
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
