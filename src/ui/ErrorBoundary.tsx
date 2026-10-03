import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { errorMessage } from './format'

interface Props {
  /** Short name of the area that failed, shown in the message. */
  label?: string
  /** How to place the fallback: in the flow (default), as a whole page, or covering the screen. */
  layout?: 'inline' | 'page' | 'overlay'
  children: ReactNode
}

interface State {
  error: unknown
}

/** Catches render errors so a failing section shows a message instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(`[${this.props.label ?? 'app'}]`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    const content = (
      <ErrorState
        title={this.props.label ? `${this.props.label} couldn't load` : 'Something went wrong'}
        message={errorMessage(this.state.error)}
        onRetry={() => this.setState({ error: null })}
      />
    )
    switch (this.props.layout) {
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
  }
}

export function ErrorState(props: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <p className="error-state__title">{props.title}</p>
      <p className="error-state__message">{props.message}</p>
      {props.onRetry && (
        <button type="button" className="btn btn--secondary" onClick={props.onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
