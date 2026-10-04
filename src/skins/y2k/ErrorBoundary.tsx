import type { ReactNode } from 'react'
import { ErrorBoundary as CoreErrorBoundary } from '../../core/ErrorBoundary'
import { errorMessage } from '../../core/format'
import { PixelIcon } from './PixelIcon'
import { WindowControls } from './Window'

interface Props {
  /** Short name of the area that failed, shown in the message. */
  label?: string
  /** How to place the fallback: in the flow (default), as a whole page, or covering the screen. */
  layout?: 'inline' | 'page' | 'overlay'
  children: ReactNode
}

/** Catches render errors so a failing section shows a message instead of a blank page. */
export function ErrorBoundary({ label, layout, children }: Props) {
  return (
    <CoreErrorBoundary
      label={label}
      fallback={(error, retry) => {
        const content = (
          <ErrorState
            title={label ? `${label} couldn't load` : 'Something went wrong'}
            message={errorMessage(error)}
            onRetry={retry}
          />
        )
        switch (layout) {
          case 'page':
            return <div className="app app--error">{content}</div>
          case 'overlay':
            return (
              <div className="modal modal--full">
                <div className="modal__panel" role="alertdialog" aria-modal="true" aria-label="Error">
                  <div className="modal__body">{content}</div>
                </div>
              </div>
            )
          default:
            return content
        }
      }}
    >
      {children}
    </CoreErrorBoundary>
  )
}

export function ErrorState(props: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="error-state win win--error" role="alert">
      <div className="win__titlebar">
        <span className="win__title" aria-hidden="true">
          Error
        </span>
        <WindowControls />
      </div>
      <div className="win__body error-state__body">
        <div className="error-state__row">
          <PixelIcon name="error" scale={3} className="error-state__icon" />
          <div className="error-state__text">
            <p className="error-state__title">{props.title}</p>
            <p className="error-state__message">{props.message}</p>
          </div>
        </div>
        {props.onRetry && (
          <div className="error-state__actions">
            <button type="button" className="btn btn--secondary" onClick={props.onRetry}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
