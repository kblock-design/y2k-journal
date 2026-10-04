// Stats in Gloss: a pinned segmented switch over four sub-views (Overview · Moods ·
// Cycle & body · Habits), each one or two phone screens of frosted cards.
//
// Every number comes from cycleStats() (src/logic/stats.ts); this file only rounds and phrases.
// Copy describes patterns in the user's own check-ins, never conditions. Anything that can't be
// shown yet says why and what unlocks it (reasonCopy), never a placeholder zero.

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '../../core/ErrorBoundary'
import { formatLongDate, PHASE_LABELS, plural } from '../../core/format'
import {
  DASH,
  dayRange,
  daysText,
  isNum,
  LEVEL_LABELS,
  MOODS_OFF_ACTION,
  MOODS_OFF_COPY,
  moodsOff,
  moodTracked,
  NOT_TRACKED,
  num,
  one,
  pct,
  PHASE_ABBR,
  reasonCopy,
  REGULARITY_WORDS,
  scalePos,
  shortDate,
  signed,
  useCycleStats,
} from '../../core/stats'
import type { Phase } from '../../logic/cycle'
import {
  CRAVINGS_LEVELS,
  ENERGY_LEVELS,
  MIN_CYCLES_FOR_PATTERN,
  MIN_CYCLES_FOR_REGULARITY,
  MIN_LOGGED_DAYS_PER_WINDOW,
  MIN_PHASE_DAYS,
  NOTABLE_MOOD_DIFFERENCE,
  PHASE_ORDER,
  SLEEP_LEVELS,
} from '../../logic/stats'
import type { BodyGroup, ComparisonPair, CompletedCycle, CycleStats, Highlight } from '../../logic/stats'
import type { DayLog, ISODate, Settings } from '../../types'
import { MOOD_ITEMS, RATING_LABELS } from '../../types'
import { Icon } from './icons'
import { heatStyle } from './statsColour'
import { PHASE_TONE } from './tones'
import { HoloChip, Kicker, Lcd, SectionError } from './ui'

export type StatsView = 'overview' | 'moods' | 'body' | 'habits'

const VIEWS: readonly { key: StatsView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'moods', label: 'Moods' },
  { key: 'body', label: 'Cycle & body' },
  { key: 'habits', label: 'Habits' },
]

/** The last sub-view picked, kept while the app is open (the screen unmounts on tab change). */
let rememberedView: StatsView = 'overview'

interface Props {
  logs: DayLog[]
  settings: Settings
  today: ISODate
  /** Opens Settings (the pointer shown while mood tracking is off). */
  onOpenSettings: () => void
  /** Sub-view to start on (tests). Defaults to the last one picked. */
  initialView?: StatsView
}

export function StatsScreen({ logs, settings, today, onOpenSettings, initialView }: Props) {
  const stats = useCycleStats(logs, today, settings)
  // Mood tracking off and nothing ever rated: one friendly line instead of the mood sections.
  const off = moodsOff(settings, stats)
  const [view, setViewState] = useState<StatsView>(initialView ?? rememberedView)
  const screenRef = useRef<HTMLDivElement>(null)

  const setView = (v: StatsView) => {
    rememberedView = v
    setViewState(v)
    // If the switch is pinned (page scrolled), jump back so the new view starts at its top.
    const el = screenRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' })
  }

  const head = (
    <header className="gl-head">
      <h1 className="gl-title">Stats</h1>
    </header>
  )

  if (!stats.sufficiency.hasLogs) {
    return (
      <div className="gl-screen gl-stats">
        {head}
        <EmptyStats />
      </div>
    )
  }

  const card = (key: string, label: string, node: ReactNode) => (
    <ErrorBoundary key={key} label={label} fallback={(e, retry) => <SectionError title={`${label} didn’t load`} error={e} onRetry={retry} />}>
      {node}
    </ErrorBoundary>
  )

  return (
    <div ref={screenRef} className="gl-screen gl-stats">
      {head}
      <ViewSwitch view={view} onChange={setView} />
      {view === 'overview' && (
        <>
          {card('hl', 'Highlights', <HighlightsCard s={stats} off={off} onShow={setView} onOpenSettings={onOpenSettings} />)}
          {card('key', 'Your cycle', <KeyNumbersCard s={stats} onShow={setView} />)}
        </>
      )}
      {view === 'moods' && off && card('moods-off', 'Moods', <MoodsOffCard onOpenSettings={onOpenSettings} />)}
      {view === 'moods' && !off && (
        <>
          {card('ba', 'Before and after', <BeforeAfterCard s={stats} />)}
          {card('mood', 'Mood by phase', <MoodByPhaseCard s={stats} />)}
          {stats.beforeAfter.available &&
            stats.beforeAfter.pairs.length > 0 &&
            card('pairs', 'Period by period', <PeriodByPeriod pairs={stats.beforeAfter.pairs} today={stats.today} />)}
        </>
      )}
      {view === 'body' && (
        <>
          {card('cycles', 'Cycle numbers', <CycleNumbersCard s={stats} />)}
          {card('body', 'Body and lifestyle', <BodyCard s={stats} />)}
        </>
      )}
      {view === 'habits' && card('habits', 'Check-in habits', <HabitsCard s={stats} />)}
      <p className="gl-stats__foot">
        <Icon name="info" size={16} />
        Patterns from your check-ins, not a diagnosis.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function ViewSwitch({ view, onChange }: { view: StatsView; onChange: (v: StatsView) => void }) {
  return (
    <div className="gl-switch">
      <div className="gl-switch__track" role="group" aria-label="Stats view">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`gl-switch__opt${v.key === view ? ' is-on' : ''}`}
            aria-pressed={v.key === view}
            onClick={() => onChange(v.key)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Card({
  title,
  kicker,
  children,
  className,
}: {
  title: string
  kicker?: string
  children: ReactNode
  className?: string
}) {
  const id = `gl-stats-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <section className={`gl-card gl-scard${className ? ` ${className}` : ''}`} aria-labelledby={id}>
      <div className="gl-scard__head">
        {kicker && <Kicker>{kicker}</Kicker>}
        <h2 id={id} className="gl-h2">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

/** "Not yet" panel: what's missing and what unlocks it. */
function Locked({ children }: { children: ReactNode }) {
  return (
    <div className="gl-locked">
      <span className="gl-locked__icon" aria-hidden="true">
        <Icon name="clock" size={18} />
      </span>
      <div className="gl-locked__text">{children}</div>
    </div>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="gl-caption">{children}</p>
}

/** Mood tracking is off (and nothing was ever rated): say so and point to Settings. */
function MoodsOffLine({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <p className="gl-caption">
      {MOODS_OFF_COPY}{' '}
      <button type="button" className="gl-link" onClick={onOpenSettings}>
        {MOODS_OFF_ACTION}
      </button>
    </p>
  )
}

function MoodsOffCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Card title="Moods">
      <MoodsOffLine onOpenSettings={onOpenSettings} />
    </Card>
  )
}

interface Tile {
  label: string
  value: string
  unit?: string
  note?: string
  word?: boolean
  muted?: boolean
}

function Tiles({ tiles, cols = 2 }: { tiles: Tile[]; cols?: 2 | 3 }) {
  return (
    <dl className={`gl-tiles gl-tiles--${cols}`}>
      {tiles.map((t) => (
        <div key={t.label} className={`gl-tile${t.muted ? ' is-muted' : ''}`}>
          <dt className="gl-tile__label">{t.label}</dt>
          <dd className="gl-tile__data">
            <span className={`gl-tile__value${t.word ? ' gl-tile__value--word' : ''}`}>{t.value}</span>
            {t.unit && <span className="gl-tile__unit"> {t.unit}</span>}
            {t.note && <span className="gl-tile__note">{t.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Thin bar, 0–1 share. */
function Bar({ share, tone = 'hot' }: { share: number | null; tone?: string }) {
  const w = isNum(share) ? Math.max(0, Math.min(1, share)) * 100 : 0
  return (
    <span className="gl-bar" aria-hidden="true">
      <span className={`gl-bar__fill gl-bar__fill--${tone}`} style={{ width: `${w}%` }} />
    </span>
  )
}

const daysUnit = (n: number | null) => (n === 1 ? 'day' : 'days')

function cycleTile(s: CycleStats): Tile {
  const L = s.cycles.lengths
  if (L.available) {
    return { label: 'Typical cycle', value: num(L.typical), unit: daysUnit(L.typical), note: L.count === 1 ? 'from 1 cycle' : `middle of ${L.count}` }
  }
  return { label: 'Typical cycle', value: 'Not yet', word: true, muted: true, note: s.sufficiency.hasPeriod ? 'after 1 full cycle' : 'log a period first' }
}

function periodTile(s: CycleStats): Tile {
  const P = s.cycles.periodLengths
  if (P.available) {
    return {
      label: 'Typical period',
      value: num(P.typical),
      unit: daysUnit(P.typical),
      note: P.completedPeriods > 1 ? dayRange(P.shortest, P.longest) : 'from 1 period',
    }
  }
  return {
    label: 'Typical period',
    value: P.reason === 'no-completed-period' ? 'In progress' : 'Not yet',
    word: true,
    muted: true,
    note: P.reason === 'no-completed-period' ? 'shows once it ends' : 'log a period first',
  }
}

function regularityTile(s: CycleStats): Tile {
  const R = s.cycles.regularity
  if (R.available) {
    return { label: 'Regularity', value: R.label ? REGULARITY_WORDS[R.label] : DASH, word: true, note: `last ${R.cyclesUsed}: ${dayRange(R.shortest, R.longest)}` }
  }
  return { label: 'Regularity', value: 'Not yet', word: true, muted: true, note: `needs ${MIN_CYCLES_FOR_REGULARITY} cycles (${R.cyclesNeeded} to go)` }
}

// ---------------------------------------------------------------------------
// Zero logs
// ---------------------------------------------------------------------------

function EmptyStats() {
  const steps = [
    'Check in tonight. Your habits start counting straight away.',
    'Log your period by picking a flow. That unlocks cycle numbers.',
    `After ${MIN_CYCLES_FOR_PATTERN} periods, see whether your moods shift the week before.`,
  ]
  return (
    <section className="gl-card gl-stats-empty" aria-labelledby="gl-stats-empty-title">
      <Kicker>0 check-ins</Kicker>
      <h2 id="gl-stats-empty-title" className="gl-h2">
        Nothing to count yet
      </h2>
      <p className="gl-stats-empty__lead">Your evening check-ins turn into numbers here:</p>
      <ol className="gl-steps">
        {steps.map((t, i) => (
          <li key={t} className="gl-steps__item">
            <Lcd size="sm" value={String(i + 1)} />
            <span>{t}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Overview: the headline, every other highlight as one line, three key numbers
// ---------------------------------------------------------------------------

const HEADLINE_ORDER: Highlight['type'][] = ['premenstrual-rise', 'similar-before-and-after', 'typical-cycle']
/** Highlights that repeat a number already on the Overview tiles. */
const ON_TILES = new Set<Highlight['type']>(['typical-cycle', 'typical-period', 'cycle-regularity'])

function pickHeadline(hs: Highlight[]): Highlight | null {
  for (const t of HEADLINE_ORDER) {
    const h = hs.find((x) => x.type === t)
    if (h) return h
  }
  return null
}

function HighlightsCard({
  s,
  off,
  onShow,
  onOpenSettings,
}: {
  s: CycleStats
  off: boolean
  onShow: (v: StatsView) => void
  onOpenSettings: () => void
}) {
  const headline = pickHeadline(s.highlights)
  const rest = s.highlights.filter((h) => h !== headline && !ON_TILES.has(h.type))
  const q = s.sufficiency
  return (
    <Card title="Highlights">
      {headline ? <Headline h={headline} onShow={onShow} /> : <UnlockList s={s} off={off} />}
      {rest.length > 0 && (
        <ul className="gl-hl">
          {rest.map((h) => {
            const v = describeLine(h)
            return (
              <li key={h.type} className="gl-hl__item">
                <Lcd size="sm" value={v.badge} unit={v.unit} className="gl-hl__badge" />
                <p className="gl-hl__text">
                  <span className="visually-hidden">
                    {v.badge} {v.unit}:{' '}
                  </span>
                  {v.text}
                </p>
              </li>
            )
          })}
        </ul>
      )}
      {off ? (
        <MoodsOffLine onOpenSettings={onOpenSettings} />
      ) : (
        headline &&
        !q.hasComparisonPattern && (
          <Caption>Mood patterns unlock after {plural(q.comparisonCyclesNeeded, 'more compared cycle')}.</Caption>
        )
      )}
    </Card>
  )
}

function Headline({ h, onShow }: { h: Highlight; onShow: (v: StatsView) => void }) {
  let badge = ''
  let unit = ''
  let title: ReactNode = null
  let sub = ''
  let moods = false
  if (h.type === 'premenstrual-rise') {
    const others = h.itemsRising - 1
    badge = signed(h.difference)
    unit = 'pts'
    title = (
      <>
        <strong>{h.label}</strong> tends to run higher the week before your period
      </>
    )
    sub = `${one(h.premenstrualMean)} before vs ${one(h.postmenstrualMean)} after · held in ${h.cyclesHigherBefore} of ${plural(h.cycles, 'cycle')}`
    if (others > 0) sub += ` · ${plural(others, 'other mood')} rose too`
    moods = true
  } else if (h.type === 'similar-before-and-after') {
    badge = '≈'
    unit = 'steady'
    title = 'Your moods look about the same before and after your period'
    sub = `Nothing rose by ${NOTABLE_MOOD_DIFFERENCE}+ points across ${plural(h.cycles, 'cycle')}`
    moods = true
  } else if (h.type === 'typical-cycle') {
    badge = num(h.days)
    unit = 'days'
    title = `Your cycle usually lasts about ${daysText(h.days)}`
    sub = `The middle of ${plural(h.cycles, 'cycle')}`
  }
  return (
    <div className="gl-headline">
      <Lcd size="md" value={badge} unit={unit} spoken={`${badge} ${unit}`} className="gl-headline__badge" />
      <p className="gl-headline__title">{title}</p>
      <p className="gl-headline__sub">{sub}</p>
      {moods && (
        <button type="button" className="gl-link gl-more" onClick={() => onShow('moods')}>
          See all moods
          <Icon name="chevron-right" size={16} />
        </button>
      )}
    </div>
  )
}

/** One short line per highlight (badge + text) for the Overview list. */
function describeLine(h: Highlight): { badge: string; unit: string; text: ReactNode } {
  switch (h.type) {
    case 'premenstrual-rise':
      return { badge: signed(h.difference), unit: 'pts', text: `${h.label} higher the week before` }
    case 'similar-before-and-after':
      return { badge: '≈', unit: 'steady', text: 'Moods steady before vs after your period' }
    case 'typical-cycle':
      return { badge: num(h.days), unit: 'days', text: `Typical cycle, middle of ${h.cycles}` }
    case 'cycle-regularity':
      return { badge: num(h.spreadDays), unit: 'd apart', text: `${REGULARITY_WORDS[h.label]}: last ${h.cycles} cycles` }
    case 'phase-symptom':
      return {
        badge: pct(h.share),
        unit: 'of days',
        text: (
          <>
            <strong>{h.label}</strong> on {h.count} of {h.phaseDays} {PHASE_LABELS[h.phase].toLowerCase()}-phase days
          </>
        ),
      }
    case 'longest-streak':
      return {
        badge: num(h.days),
        unit: 'days',
        text: h.isCurrent ? `You’re on a ${h.days}-day check-in streak, your best yet.` : `Best run so far, ${shortDate(h.start)} – ${shortDate(h.end)}`,
      }
    case 'typical-period':
      return { badge: num(h.days), unit: 'days', text: `Typical period, across ${plural(h.periods, 'period')}` }
    case 'coverage':
      return { badge: pct(h.share), unit: 'logged', text: `Checked in on ${h.daysLogged} of ${h.daysPossible} days since you started` }
  }
}

function UnlockList({ s, off }: { s: CycleStats; off: boolean }) {
  const q = s.sufficiency
  const all: { done: boolean; label: string; note: string | null; mood?: boolean }[] = [
    { done: q.hasPeriod, label: 'Log a period', note: q.hasPeriod ? null : 'pick a flow in your check-in' },
    { done: q.hasCycleLengths, label: 'Finish one full cycle', note: q.hasCycleLengths ? null : 'one period start to the next' },
    {
      mood: true,
      done: q.hasComparison,
      label: 'Get a before-and-after look',
      note: q.hasComparison ? null : `${MIN_LOGGED_DAYS_PER_WINDOW}+ check-ins before a period and in days 4–10`,
    },
    {
      mood: true,
      done: q.hasComparisonPattern,
      label: `Compare ${MIN_CYCLES_FOR_PATTERN} cycles for mood patterns`,
      note: q.hasComparisonPattern ? null : `${plural(q.comparisonCyclesNeeded, 'more cycle')} to go`,
    },
    {
      done: q.hasRegularity,
      label: `${MIN_CYCLES_FOR_REGULARITY} cycles for regularity`,
      note: q.hasRegularity ? null : `${plural(q.cyclesNeededForRegularity, 'more cycle')} to go`,
    },
  ]
  // With mood tracking off (and no mood history) the mood steps can't unlock, so they're left out.
  const steps = off ? all.filter((x) => !x.mood) : all
  const done = steps.filter((x) => x.done).length
  return (
    <div className="gl-unlock">
      <p className="gl-unlock__lead">
        No big finding yet · {done} of {steps.length} unlocked
      </p>
      <span className="gl-meter gl-meter--wide" aria-hidden="true">
        {steps.map((x, i) => (
          <span key={x.label} className={i < done ? 'is-on' : ''} />
        ))}
      </span>
      <ol className="gl-unlock__list">
        {steps.map((x) => (
          <li key={x.label} className={`gl-unlock__step${x.done ? ' is-done' : ''}`}>
            <span className="gl-unlock__box" aria-hidden="true">
              {x.done && <Icon name="check" size={14} />}
            </span>
            <span className="gl-unlock__label">
              <span className="visually-hidden">{x.done ? 'Done: ' : 'To do: '}</span>
              {x.label}
              {x.note && <span className="gl-unlock__note">{x.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function KeyNumbersCard({ s, onShow }: { s: CycleStats; onShow: (v: StatsView) => void }) {
  const headline = pickHeadline(s.highlights)
  const tiles = [cycleTile(s), periodTile(s), regularityTile(s)].filter((t) => !(headline?.type === 'typical-cycle' && t.label === 'Typical cycle'))
  return (
    <Card title="Your cycle">
      <Tiles tiles={tiles} cols={tiles.length === 3 ? 3 : 2} />
      <button type="button" className="gl-link gl-more" onClick={() => onShow('body')}>
        All cycle numbers and body stats
        <Icon name="chevron-right" size={16} />
      </button>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Moods: before vs after (all moods), mood by phase, period by period
// ---------------------------------------------------------------------------

function BeforeAfterCard({ s }: { s: CycleStats }) {
  const ba = s.beforeAfter
  const title = 'Before vs after your period'

  if (!ba.available) {
    return (
      <Card title={title}>
        <Locked>
          {ba.reason === 'not-enough-window-days' ? (
            <WindowDaysHelp pairs={ba.pairs} today={s.today} />
          ) : (
            <p>{ba.reason ? reasonCopy(ba.reason, s) : 'Not enough check-ins around a period yet.'}</p>
          )}
          <p>
            A pattern needs {MIN_CYCLES_FOR_PATTERN} compared cycles; you have {ba.cyclesCompared}.
          </p>
        </Locked>
        <Caption>Compares the week before each period with days 4–10 after it starts.</Caption>
      </Card>
    )
  }

  const byKey = new Map(ba.items.map((i) => [i.key, i]))
  const ranked = ba.ranked.flatMap((k) => {
    const it = byKey.get(k)
    return it && isNum(it.premenstrualMean) && isNum(it.postmenstrualMean) && isNum(it.difference) ? [it] : []
  })
  const rankedKeys = new Set(ranked.map((i) => i.key))
  const missing = ba.items.filter((i) => !rankedKeys.has(i.key))
  const o = ba.overall

  return (
    <Card title={title}>
      {!ba.enoughCycles && (
        <p className="gl-basis">
          <HoloChip>early look</HoloChip> Just {plural(ba.cyclesCompared, 'cycle')} so far: a first peek, not a pattern.
        </p>
      )}
      <div className="gl-db-legend" aria-hidden="true">
        <span>
          <span className="gl-db__dot gl-db__dot--before gl-db__dot--static" /> week before
        </span>
        <span>
          <span className="gl-db__dot gl-db__dot--after gl-db__dot--static" /> days 4–10
        </span>
      </div>
      <ul className="gl-db-list">
        <li className="gl-db gl-db--scale" aria-hidden="true">
          <span />
          <span className="gl-db-scale">
            <span>1</span>
            <span>6</span>
          </span>
          <span className="gl-db-scale__pts">pts</span>
        </li>
        {isNum(o.premenstrualMean) && isNum(o.postmenstrualMean) && isNum(o.difference) && (
          <MoodRow label="All moods (avg)" pre={o.premenstrualMean} post={o.postmenstrualMean} diff={o.difference} higher={o.cyclesHigherBefore} compared={ba.cyclesCompared} total />
        )}
        {ranked.map((it) => (
          <MoodRow
            key={it.key}
            label={it.label}
            pre={it.premenstrualMean as number}
            post={it.postmenstrualMean as number}
            diff={it.difference as number}
            higher={it.cyclesHigherBefore}
            compared={it.cyclesCompared}
          />
        ))}
        {missing.map((it) => (
          <li key={it.key} className="gl-db is-missing">
            <span className="gl-db__label">{it.label}</span>
            <span className="gl-db__none">{moodTracked(s, it.key) ? 'not enough ratings yet' : NOT_TRACKED}</span>
          </li>
        ))}
      </ul>
      <Caption>
        From {plural(ba.cyclesCompared, 'cycle')}, 1 {RATING_LABELS[1].toLowerCase()} to 6 {RATING_LABELS[6].toLowerCase()}. +1.0 is one
        full step, like mild to moderate.
      </Caption>
    </Card>
  )
}

function MoodRow(props: { label: string; pre: number; post: number; diff: number; higher: number; compared: number; total?: boolean }) {
  const { label, pre, post, diff, higher, compared, total } = props
  const a = scalePos(pre)
  const b = scalePos(post)
  const lo = Math.min(a, b)
  const width = Math.abs(a - b)
  const r = Math.round(diff * 10) / 10
  const direction = r > 0 ? 'is-up' : r < 0 ? 'is-down' : 'is-flat'
  return (
    <li className={`gl-db${total ? ' gl-db--total' : ''}`}>
      <span className="gl-db__label">
        {label}
        <span className="visually-hidden">
          : {one(pre)} before, {one(post)} after, higher before in {higher} of {plural(compared, 'cycle')}.
        </span>
      </span>
      <span className="gl-db__track" aria-hidden="true">
        <span className="gl-db__link" style={{ left: `${lo}%`, width: `${width}%` }} />
        <span className="gl-db__dot gl-db__dot--after" style={{ left: `${b}%` }} />
        <span className="gl-db__dot gl-db__dot--before" style={{ left: `${a}%` }} />
      </span>
      <span className={`gl-db__diff ${direction}`}>
        {signed(diff)}
        <span className="visually-hidden"> points</span>
      </span>
    </li>
  )
}

/** Why no period has been compared yet, using the most recent period start. */
function WindowDaysHelp({ pairs, today }: { pairs: ComparisonPair[]; today: ISODate }) {
  const need = MIN_LOGGED_DAYS_PER_WINDOW
  const latest = pairs[pairs.length - 1]
  const rule = `A period counts once it has ${need}+ check-ins in the week before and ${need}+ in days 4–10.`
  if (!latest) return <p>{rule}</p>
  const pre = latest.premenstrual.daysLogged
  const post = latest.postmenstrual.daysLogged
  const postAhead = latest.postmenstrual.to > today
  const postStarted = latest.postmenstrual.from <= today
  let status = `Latest (${shortDate(latest.periodStart)}): ${pre} of 7 before`
  if (!postAhead) status += `, ${post} of 7 after.`
  else if (postStarted) status += `; days 4–10 are underway (${post} so far).`
  else status += `; days 4–10 are still ahead.`
  const next = postAhead && pre >= need ? 'Keep checking in through day 10.' : 'Check in nightly so your next one counts.'
  return (
    <>
      <p>{rule}</p>
      <p>
        {status} {next}
      </p>
    </>
  )
}

function PeriodByPeriod({ pairs, today }: { pairs: ComparisonPair[]; today: ISODate }) {
  const need = MIN_LOGGED_DAYS_PER_WINDOW
  return (
    <details className="gl-card gl-details">
      <summary className="gl-details__summary">
        <span>Period by period ({pairs.length})</span>
        <Icon name="chevron-down" size={18} className="gl-details__chev" />
      </summary>
      <ul className="gl-pairs">
        {[...pairs].reverse().map((p) => (
          <li key={p.periodStart} className={`gl-pairs__item${p.contributes ? '' : ' is-skipped'}`}>
            <span className="gl-pairs__date">{shortDate(p.periodStart)}</span>
            <span className="gl-pairs__what">
              {p.contributes && isNum(p.difference)
                ? `${signed(p.difference)} pts (${one(p.premenstrual.mean)} before, ${one(p.postmenstrual.mean)} after)`
                : p.postmenstrual.to > today && p.premenstrual.daysLogged >= need
                  ? 'not counted yet: days 4–10 in progress'
                  : `not counted: ${p.premenstrual.daysLogged}/7 before, ${p.postmenstrual.daysLogged}/7 after (needs ${need} each)`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}

function PhaseHeaders({ withAll, thin }: { withAll?: boolean; thin: (p: Phase) => boolean }) {
  return (
    <>
      {PHASE_ORDER.map((p) => (
        <th key={p} scope="col" className="gl-heat__phase">
          <span className={`gl-heat__pill gl-tone--${PHASE_TONE[p]}`} aria-hidden="true">
            {PHASE_ABBR[p]}
            {thin(p) ? '*' : ''}
          </span>
          <span className="visually-hidden">
            {PHASE_LABELS[p]}
            {thin(p) ? ', not enough days yet' : ''}
          </span>
        </th>
      ))}
      {withAll && (
        <th scope="col" className="gl-heat__phase">
          <span className="gl-heat__pill gl-heat__pill--all" aria-hidden="true">
            All
          </span>
          <span className="visually-hidden">All days</span>
        </th>
      )}
    </>
  )
}

function PhaseKey() {
  return (
    <Caption>
      {PHASE_ORDER.map((p, i) => (
        <span key={p}>
          {i > 0 && ' · '}
          {PHASE_ABBR[p]} {PHASE_LABELS[p].toLowerCase()}
        </span>
      ))}
    </Caption>
  )
}

function MoodByPhaseCard({ s }: { s: CycleStats }) {
  const m = s.moodByPhase
  if (!m.available) {
    return (
      <Card title="Mood by phase">
        <Locked>
          <p>{m.reason ? reasonCopy(m.reason, s) : 'No check-ins inside a phase yet.'}</p>
        </Locked>
      </Card>
    )
  }
  const thin = new Map(m.phases.map((p) => [p.phase, !p.enoughData]))
  const anyThin = m.phases.some((p) => !p.enoughData)
  return (
    <Card title="Mood by phase">
      <table className="gl-heat">
        <caption className="visually-hidden">Average mood rating by estimated cycle phase, from 1 (not at all) to 6 (extreme)</caption>
        <thead>
          <tr>
            <th scope="col" className="gl-heat__corner">
              <span className="visually-hidden">Mood</span>
            </th>
            <PhaseHeaders thin={(p) => thin.get(p) ?? false} />
          </tr>
        </thead>
        <tbody>
          {MOOD_ITEMS.map((item) => (
            <tr key={item.key}>
              <th scope="row" className="gl-heat__row">
                {item.label}
              </th>
              {moodTracked(s, item.key) ? (
                m.phases.map((p) => (
                  <HeatCell key={p.phase} value={p.items.find((i) => i.key === item.key)?.mean ?? null} thin={!p.enoughData} />
                ))
              ) : (
                <td colSpan={m.phases.length} className="gl-heat__cell">
                  <span className="gl-heat__none">{NOT_TRACKED}</span>
                </td>
              )}
            </tr>
          ))}
          <tr className="gl-heat__total">
            <th scope="row" className="gl-heat__row">
              All moods
            </th>
            {m.phases.map((p) => (
              <HeatCell key={p.phase} value={p.overallMean} thin={!p.enoughData} />
            ))}
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="gl-heat__row">
              Days logged
            </th>
            {m.phases.map((p) => (
              <td key={p.phase} className="gl-heat__days">
                {p.daysLogged}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <Caption>Average rating (1–6) in each estimated phase. Deeper pink is higher.</Caption>
      <PhaseKey />
      {anyThin && <Caption>* Fewer than {MIN_PHASE_DAYS} days logged, so read loosely.</Caption>}
      {m.unknownPhaseDays > 0 && (
        <Caption>
          {plural(m.unknownPhaseDays, 'logged day')} couldn’t be placed in a phase and {m.unknownPhaseDays === 1 ? 'is' : 'are'} left out.
        </Caption>
      )}
    </Card>
  )
}

/** A rating mean (1–6) or, with `share`, a 0–1 share shown as a percentage. */
function HeatCell({ value, thin, share, extra }: { value: number | null; thin: boolean; share?: boolean; extra?: string }) {
  if (!isNum(value)) {
    return (
      <td className={`gl-heat__cell is-empty${thin ? ' is-thin' : ''}`}>
        <span aria-hidden="true">{DASH}</span>
        <span className="visually-hidden">no data yet</span>
      </td>
    )
  }
  const t = share ? value : scalePos(value) / 100
  return (
    <td className={`gl-heat__cell${thin ? ' is-thin' : ''}`}>
      <span className="gl-heat__val" style={heatStyle(t)}>
        {share ? pct(value) : one(value)}
        {extra && <span className="visually-hidden"> {extra}</span>}
      </span>
    </td>
  )
}

// ---------------------------------------------------------------------------
// Cycle & body
// ---------------------------------------------------------------------------

function CycleNumbersCard({ s }: { s: CycleStats }) {
  const { lengths: L, periodsLogged } = s.cycles
  const periodsTile: Tile = { label: 'Periods logged', value: String(periodsLogged) }
  return (
    <Card title="Cycle numbers">
      {L.available ? (
        <>
          <Tiles
            tiles={[
              cycleTile(s),
              regularityTile(s),
              { label: 'Shortest', value: num(L.shortest), unit: daysUnit(L.shortest) },
              { label: 'Longest', value: num(L.longest), unit: daysUnit(L.longest) },
              periodTile(s),
              periodsTile,
            ]}
          />
          <CycleChart history={L.history} typical={L.typical} />
        </>
      ) : (
        <>
          <Locked>
            <p>{L.reason ? reasonCopy(L.reason, s) : 'Cycle lengths need one full cycle.'}</p>
          </Locked>
          {s.sufficiency.hasPeriod && <Tiles tiles={[periodTile(s), periodsTile]} />}
        </>
      )}
      {L.skippedGaps > 0 && (
        <Caption>
          {L.skippedGaps === 1
            ? '1 long gap between periods was left out (probably an unlogged period).'
            : `${L.skippedGaps} long gaps between periods were left out (probably unlogged periods).`}
        </Caption>
      )}
    </Card>
  )
}

const HISTORY_MAX = 12

function CycleChart({ history, typical }: { history: CompletedCycle[]; typical: number | null }) {
  const shown = history.slice(-HISTORY_MAX).reverse()
  if (shown.length === 0) return null
  const max = Math.max(...shown.map((c) => c.length), isNum(typical) ? typical : 0)
  if (!isNum(max) || max <= 0) return null
  const typicalAt = isNum(typical) ? (typical / max) * 100 : null
  return (
    <div className="gl-history">
      <h3 className="gl-h3">Cycle by cycle{history.length > shown.length ? ` (last ${shown.length})` : ''}</h3>
      <ul className="gl-history__list">
        {shown.map((c) => (
          <li key={c.start} className="gl-history__row">
            <span className="gl-history__date">{shortDate(c.start)}</span>
            <span className="gl-history__track" aria-hidden="true">
              <span className="gl-history__fill" style={{ width: `${(c.length / max) * 100}%` }} />
              {typicalAt !== null && <span className="gl-history__typical" style={{ left: `${typicalAt}%` }} />}
            </span>
            <span className="gl-history__val">
              {c.length}
              <span aria-hidden="true"> d</span>
              <span className="visually-hidden"> days, the cycle that started {formatLongDate(c.start)}</span>
            </span>
          </li>
        ))}
      </ul>
      {typicalAt !== null && <Caption>Newest first. The dashed line is your typical {num(typical)} days.</Caption>}
    </div>
  )
}

function BodyCard({ s }: { s: CycleStats }) {
  const b = s.body
  const top = b.overall.topSymptoms.slice(0, 5)
  return (
    <Card title="Body and lifestyle">
      <h3 className="gl-h3">Top symptoms</h3>
      {top.length > 0 ? (
        <ul className="gl-bars">
          {top.map((x) => (
            <li key={x.key} className="gl-barrow">
              <span className="gl-barrow__label">{x.label}</span>
              <Bar share={x.share} />
              <span className="gl-barrow__val">
                {pct(x.share)}
                <span className="visually-hidden">
                  {' '}
                  of days ({x.count} of {b.overall.daysLogged})
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Caption>No body symptoms logged yet.</Caption>
      )}

      <h3 className="gl-h3">Symptoms by phase</h3>
      {!b.byPhase.available ? (
        <Locked>
          <p>{b.byPhase.reason ? reasonCopy(b.byPhase.reason, s) : 'No check-ins inside a phase yet.'}</p>
        </Locked>
      ) : top.length === 0 ? (
        <Caption>Nothing to split by phase yet.</Caption>
      ) : (
        <SymptomTable s={s} />
      )}

      <h3 className="gl-h3">Sleep, energy and cravings</h3>
      <div className="gl-levels">
        <LevelBlock title="Sleep" levels={SLEEP_LEVELS} get={(g) => g.sleep} s={s} />
        <LevelBlock title="Energy" levels={ENERGY_LEVELS} get={(g) => g.energy} s={s} />
        <LevelBlock title="Cravings" levels={CRAVINGS_LEVELS} get={(g) => g.cravings} s={s} />
      </div>
    </Card>
  )
}

function SymptomTable({ s }: { s: CycleStats }) {
  const phases = s.body.byPhase.phases
  const order = s.body.overall.topSymptoms
  const thin = new Map(phases.map((p) => [p.phase, !p.enoughData]))
  return (
    <>
      <table className="gl-heat gl-heat--body">
        <caption className="visually-hidden">Share of logged days with each symptom, by estimated phase</caption>
        <thead>
          <tr>
            <th scope="col" className="gl-heat__corner">
              <span className="visually-hidden">Symptom</span>
            </th>
            <PhaseHeaders thin={(p) => thin.get(p) ?? false} />
          </tr>
        </thead>
        <tbody>
          {order.map((sym) => (
            <tr key={sym.key}>
              <th scope="row" className="gl-heat__row">
                {sym.label}
              </th>
              {phases.map((p) => {
                const x = p.symptoms.find((y) => y.key === sym.key)
                return <HeatCell key={p.phase} value={x?.share ?? null} thin={!p.enoughData} share extra={`(${x?.count ?? 0} of ${p.daysLogged} days)`} />
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <Caption>Share of each phase’s logged days with that symptom.</Caption>
    </>
  )
}

function LevelBlock<T extends string>(props: { title: string; levels: readonly T[]; get: (g: BodyGroup) => Record<T, number>; s: CycleStats }) {
  const { title, levels, get, s } = props
  const rows: { key: string; label: string; abbr: string; phase: Phase | null; group: BodyGroup; thin: boolean }[] = [
    ...(s.body.byPhase.available
      ? s.body.byPhase.phases.map((p) => ({
          key: p.phase,
          label: PHASE_LABELS[p.phase],
          abbr: PHASE_ABBR[p.phase],
          phase: p.phase as Phase | null,
          group: p as BodyGroup,
          thin: !p.enoughData,
        }))
      : []),
    { key: 'all', label: 'All days', abbr: 'All', phase: null, group: s.body.overall, thin: false },
  ]
  return (
    <div className="gl-level">
      <div className="gl-level__head">
        <p className="gl-level__title">{title}</p>
        <ul className="gl-level__legend" aria-hidden="true">
          {levels.map((l, i) => (
            <li key={l}>
              <span className={`gl-level__sw gl-lv-${i}`} />
              {LEVEL_LABELS[l] ?? l}
            </li>
          ))}
        </ul>
      </div>
      <ul className="gl-level__rows">
        {rows.map((r) => {
          const counts = get(r.group)
          const total = levels.reduce((n, l) => n + (counts[l] ?? 0), 0)
          const parts = levels.map((l) => ({ l, share: total > 0 ? (counts[l] ?? 0) / total : 0 }))
          const desc =
            total > 0
              ? `${title}, ${r.label}: ${parts.map((p) => `${LEVEL_LABELS[p.l] ?? p.l} ${pct(p.share)}`).join(', ')} of ${plural(total, 'day')}${r.thin ? ' (not enough days yet)' : ''}`
              : `${title}, ${r.label}: no days yet`
          return (
            <li key={r.key} className={`gl-level__row${r.thin ? ' is-thin' : ''}`}>
              <span className={`gl-level__abbr${r.phase ? ` gl-tone--${PHASE_TONE[r.phase]}` : ''}`} aria-hidden="true">
                {r.abbr}
              </span>
              {total > 0 ? (
                <span className="gl-level__bar" role="img" aria-label={desc}>
                  {parts.map((p, i) => p.share > 0 && <span key={p.l} className={`gl-level__seg gl-lv-${i}`} style={{ width: `${p.share * 100}%` }} />)}
                </span>
              ) : (
                <span className="gl-level__none">
                  <span aria-hidden="true">no days yet</span>
                  <span className="visually-hidden">{desc}</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

function HabitsCard({ s }: { s: CycleStats }) {
  const h = s.habits
  const c = h.coverage
  const longest = h.longestStreak
  const streakNote = h.currentStreak === 0 ? 'Your next check-in starts one.' : h.loggedToday ? 'Today included.' : 'Check in tonight to keep it.'
  const tiles: Tile[] = [
    {
      label: 'Longest streak',
      value: String(longest.days),
      unit: daysUnit(longest.days),
      note: longest.isCurrent ? 'that’s this one' : longest.start && longest.end ? `${shortDate(longest.start)} – ${shortDate(longest.end)}` : undefined,
    },
    { label: 'Days logged', value: String(h.daysLogged), note: h.firstLogDate ? `since ${shortDate(h.firstLogDate)}` : undefined },
    { label: 'Filled in later', value: String(h.backfilledEntries), note: 'done the next day' },
  ]
  return (
    <Card title="Check-in habits">
      <div className="gl-habit-streak">
        <Lcd size="lg" value={String(h.currentStreak).padStart(2, '0')} unit={daysUnit(h.currentStreak)} spoken={`Current streak: ${plural(h.currentStreak, 'day')}`} />
        <p className="gl-habit-streak__text">
          <span className="gl-habit-streak__title">Current streak</span>
          <span className="gl-habit-streak__note">{streakNote}</span>
        </p>
      </div>
      <div className="gl-rate-block">
        <p className="gl-barrow gl-barrow--head">
          <span className="gl-barrow__label">Check-in rate</span>
          {isNum(c.share) ? <Bar share={c.share} tone="mint" /> : <span className="gl-barrow__hint">Counts from tomorrow.</span>}
          {isNum(c.share) && <span className="gl-barrow__val">{pct(c.share)}</span>}
        </p>
        {isNum(c.share) && (
          <Caption>
            {c.daysLogged} of {c.daysPossible} days, through yesterday.
          </Caption>
        )}
      </div>
      <Tiles tiles={tiles} />
      {h.futureEntriesIgnored > 0 && (
        <Caption>
          {h.futureEntriesIgnored === 1
            ? '1 entry dated in the future isn’t counted yet.'
            : `${h.futureEntriesIgnored} entries dated in the future aren’t counted yet.`}
        </Caption>
      )}
    </Card>
  )
}
