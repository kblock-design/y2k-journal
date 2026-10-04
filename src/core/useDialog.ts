import { useEffect, useId, useRef } from 'react'

/**
 * Behaviour for a modal dialog (check-in, confirmations): locks page scroll while mounted,
 * moves focus into the panel so screen readers announce it, and closes on Escape when
 * `onClose` is given (omit it for an undismissable, blocking dialog).
 *
 * Put `ref={panelRef}`, `tabIndex={-1}`, `role="dialog"`, `aria-modal="true"` and
 * `aria-labelledby={titleId}` on the panel, and `id={titleId}` on its heading.
 */
export function useDialog(onClose?: () => void) {
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

  return { titleId, panelRef }
}
