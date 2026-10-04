import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from './format'

/** Longest pet name the hatch form accepts (use as the input's maxLength). */
export const PET_NAME_MAX = 20

/**
 * State for naming and hatching a pet (pet skins only). `submit` is a form onSubmit handler;
 * it trims the name and calls `onHatch` (usually `app.hatchPet`). On success the app reloads
 * and the form unmounts; on failure `error` is set and `busy` clears.
 */
export function useHatchForm(onHatch: (name: string) => Promise<void>) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      await onHatch(trimmed)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return { name, setName, busy, error, canSubmit: !!trimmed && !busy, submit }
}
