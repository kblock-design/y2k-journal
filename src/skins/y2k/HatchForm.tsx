import { PET_NAME_MAX, useHatchForm } from '../../core/useHatchForm'
import { PetSprite } from './pet'
import { RhinestoneRow } from './stickers'
import { Window } from './Window'

interface Props {
  title: string
  intro?: string
  onHatch: (name: string) => Promise<void>
  onCancel?: () => void
}

export function HatchForm({ title, intro, onHatch, onCancel }: Props) {
  const { name, setName, busy, error, canSubmit, submit } = useHatchForm(onHatch)

  return (
    <Window
      tone="black"
      icon="egg"
      title="new_pet.exe"
      className="hatch-window"
      menu={['File', 'Egg', 'Help']}
      status="1 egg ready to hatch"
      stickers={[
        { name: 'star', corner: 'tl', size: 42, rotate: -10 },
        { name: 'cursor', corner: 'br', size: 40, rotate: 12 },
      ]}
    >
      <form className="hatch" onSubmit={submit}>
        <div className="hatch__art" aria-hidden="true">
          <span className="hatch__nest">
            <PetSprite stage="egg" health="happy" size={112} />
          </span>
          <RhinestoneRow count={7} className="hatch__gems" />
        </div>
        <h2 className="hatch__title">{title}</h2>
        {intro && <p className="hatch__intro">{intro}</p>}
        <label className="field">
          <span className="field__label">Name</span>
          <input
            className="input hatch__input"
            type="text"
            value={name}
            maxLength={PET_NAME_MAX}
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
        <button type="submit" className="btn btn--primary btn--block btn--glossy" disabled={!canSubmit}>
          {busy ? 'Hatching…' : 'Hatch'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn--link" onClick={onCancel}>
            Not now
          </button>
        )}
      </form>
    </Window>
  )
}
