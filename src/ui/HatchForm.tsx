import { useState } from 'react'
import type { FormEvent } from 'react'
import { errorMessage } from './format'

interface Props {
  title: string
  intro?: string
  onHatch: (name: string) => Promise<void>
  onCancel?: () => void
}

export function HatchForm({ title, intro, onHatch, onCancel }: Props) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
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

  return (
    <form className="hatch card" onSubmit={submit}>
      <div className="hatch__art" aria-hidden="true">
        🥚
      </div>
      <h2 className="hatch__title">{title}</h2>
      {intro && <p className="hatch__intro">{intro}</p>}
      <label className="field">
        <span className="field__label">Name</span>
        <input
          className="input hatch__input"
          type="text"
          value={name}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          placeholder="e.g. Bean"
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block" disabled={!trimmed || busy}>
        {busy ? 'Hatching…' : 'Hatch'}
      </button>
      {onCancel && (
        <button type="button" className="btn btn--link" onClick={onCancel}>
          Not now
        </button>
      )}
    </form>
  )
}
