import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  /** Short name of the area, used in the console log (and handy in the fallback's copy). */
  label?: string
  /** What to show instead of the children after a render error. `retry` re-renders the children. */
  fallback: (error: unknown, retry: () => void) => ReactNode
  children: ReactNode
}

interface State {
  error: unknown
}

/**
 * Unstyled error boundary: catches render errors so a failing section shows the skin's own
 * fallback instead of a blank page. Wrap each screen (key it by tab so switching tabs
 * resets it), each independent card, and the check-in. Use `errorMessage(error)` for text.
 */
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
    return this.props.fallback(this.state.error, () => this.setState({ error: null }))
  }
}
