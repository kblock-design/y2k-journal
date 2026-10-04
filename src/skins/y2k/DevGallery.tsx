import type { PetHealth, PetStage, PetStatus } from '../../logic/pet'
import { BrandWord } from './BrandWord'
import { ErrorState } from './ErrorBoundary'
import { PetView } from './PetView'
import { BACKGROUNDS, STICKER_THEMES, TITLE_STYLES } from './prefs'
import { themedSticker } from './stickerThemes'
import { Sticker, STICKER_NAMES } from './stickers'
import type { StickerName } from './stickers'

// Development-only page (open with ?gallery=1) showing every visual state side by side.

/** The home screen's scatter slots (top to bottom), then its wordmark pair and window corners. */
const HOME_SLOTS: StickerName[] = [
  'cd',
  'flipPhone',
  'cassette',
  'chromeStar',
  'lipGloss',
  'smiley',
  'heart',
  'sparkle',
  'gem',
  'lips',
  'cherry',
]
const STAGES: PetStage[] = ['egg', 'baby', 'teen', 'adult']
const HEALTHS: PetHealth[] = ['happy', 'sad', 'sick', 'critical', 'dead']
const MISSED: Record<PetHealth, number> = { happy: 0, sad: 1, sick: 2, critical: 3, dead: 5 }

function status(stage: PetStage, health: PetHealth): PetStatus {
  return {
    stage,
    health,
    missedDays: MISSED[health],
    streak: health === 'happy' ? 12 : 0,
    ageDays: { egg: 0, baby: 3, teen: 10, adult: 40 }[stage],
    diedOn: health === 'dead' ? '2026-10-01' : null,
    message: `${health} ${stage} says hi!`,
  }
}

export function DevGallery() {
  return (
    <div style={{ padding: 16, display: 'grid', gap: 24 }}>
      {TITLE_STYLES.map((s) => (
        <div key={s.key}>
          <small>{s.label}</small>
          <BrandWord variant={s.key} />
        </div>
      ))}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {STICKER_NAMES.map((name) => (
          <figure key={name} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
            <Sticker name={name} size={72} />
            <small>{name}</small>
          </figure>
        ))}
      </div>
      {/* Each theme's cast for the home scatter slots, at their real sizes. */}
      {STICKER_THEMES.map((t) => (
        <div key={t.key}>
          <small>{t.label}</small>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {HOME_SLOTS.map((slot) => {
              const drawn = themedSticker(slot, t.key, 60)
              return drawn && <Sticker key={slot} name={drawn.name} size={drawn.size} />
            })}
          </div>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 180px)', gap: 12 }}>
        {BACKGROUNDS.map((b) => (
          <div key={b.key}>
            <small>{b.label}</small>
            <span className="bg-swatch" data-bg={b.key} style={{ height: 120 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 358px)', gap: 24 }}>
        {STAGES.flatMap((stage) =>
          HEALTHS.map((health) => <PetView key={`${stage}-${health}`} status={status(stage, health)} name="Bean" />),
        )}
      </div>
      <ErrorState title="Couldn't open your data" message="Example error message" onRetry={() => {}} />
    </div>
  )
}
