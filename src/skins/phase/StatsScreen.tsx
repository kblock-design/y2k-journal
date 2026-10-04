// The Stats tab in Phase: rounded cards, big numbers, a dot plot for before vs after and soft
// heat grids for anything split by phase.
//
// Every number comes from cycleStats() (src/logic/stats.ts); this file only rounds and phrases.
// Copy describes patterns in the user's own check-ins, never conditions. Sections that can't
// be shown yet say why and what unlocks them, never placeholder zeros.
//
// Layout: four sub-views behind a pinned switch (Overview · Moods · Cycle & body · Habits), so
// nothing is cut but each view stays about one or two phone screens. Every card follows the
// same pattern: a short title, the key number or chart, one caption line.

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
  monthYear,
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
import type { IconName } from './icons'
import { Shape } from './shapes'
import type { ShapeKind, Tone } from './shapes'
import { PHASE_TONE } from './tones'
import { IconChip, SectionError } from './ui'

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
  onOpenSettings: () => void
  /** Sub-view to start on (tests, deep links). Defaults to the last one picked. */
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
    <header className="ph-head">
      <h1 className="ph-title">Stats</h1>
    </header>
  )

  if (!stats.sufficiency.hasLogs) {
    return (
      <div className="ph-screen ph-stats">
        {head}
        <EmptyStats />
      </div>
    )
  }

  const card = (key: string, label: string, node: ReactNode) => (
    <ErrorBoundary
      key={key}
      label={label}
      fallback={(e, retry) => <SectionError title={`${label} didn’t load`} error={e} onRetry={retry} />}
    >
      {node}
    </ErrorBoundary>
  )

  return (
    <div ref={screenRef} className="ph-screen ph-stats">
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
      <aside className="ph-footnote">
        <Icon name="info" size={20} />
        <p>
          Estimates from your own check-ins, not a diagnosis.{' '}
          <button type="button" className="ph-link" onClick={onOpenSettings}>
            Export in Settings
          </button>
        </p>
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function ViewSwitch({ view, onChange }: { view: StatsView; onChange: (v: StatsView) => void }) {
  return (
    <div className="ph-stats-switch">
      <div className="ph-stats-switch__group" role="group" aria-label="Stats view">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`ph-stats-switch__opt${v.key === view ? ' is-on' : ''}`}
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
  icon,
  tone,
  children,
  className,
}: {
  title: string
  icon: IconName
  tone: string
  children: ReactNode
  className?: string
}) {
  const id = `ph-stats-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`
  return (
    <section className={`ph-card ph-scard${className ? ` ${className}` : ''}`} aria-labelledby={id}>
      <div className="ph-scard__head">
        <IconChip icon={icon} tone={tone} size="sm" />
        <h2 id={id} className="ph-h2">
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
    <div className="ph-locked">
      <span className="ph-locked__icon" aria-hidden="true">
        <Icon name="clock" size={18} />
      </span>
      <div className="ph-locked__text">{children}</div>
    </div>
  )
}

/** Mood tracking is off (and nothing was ever rated): say so and point to Settings. */
function MoodsOffLine({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <p className="ph-note-line">
      {MOODS_OFF_COPY}{' '}
      <button type="button" className="ph-link" onClick={onOpenSettings}>
        {MOODS_OFF_ACTION}
      </button>
    </p>
  )
}

function MoodsOffCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Card title="Moods" icon="heart" tone="pink">
      <MoodsOffLine onOpenSettings={onOpenSettings} />
    </Card>
  )
}

/** One quiet caption line under a chart or number. */
function Caption({ children }: { children: ReactNode }) {
  return <p className="ph-note-line">{children}</p>
}

interface Tile {
  label: string
  value: string
  unit?: string
  note?: string
  word?: boolean
  muted?: boolean
  wide?: boolean
}

function Tiles({ tiles, cols = 2 }: { tiles: Tile[]; cols?: 2 | 3 }) {
  return (
    <dl className={`ph-tiles ph-tiles--${cols}`}>
      {tiles.map((t) => (
        <div key={t.label} className={`ph-tile${t.muted ? ' is-muted' : ''}${t.wide ? ' ph-tile--wide' : ''}`}>
          <dt className="ph-tile__label">{t.label}</dt>
          <dd className="ph-tile__data">
            <span className={`ph-tile__value${t.word ? ' ph-tile__value--word' : ''}`}>{t.value}</span>
            {t.unit && <span className="ph-tile__unit"> {t.unit}</span>}
            {t.note && <span className="ph-tile__note">{t.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

const daysUnit = (n: number | null) => (n === 1 ? 'day' : 'days')

function cycleTile(s: CycleStats): Tile {
  const L = s.cycles.lengths
  if (L.available) {
    return {
      label: 'Typical cycle',
      value: num(L.typical),
      unit: daysUnit(L.typical),
      note: L.count === 1 ? 'from 1 cycle' : `middle of ${L.count}`,
    }
  }
  return {
    label: 'Typical cycle',
    value: 'Not yet',
    word: true,
    muted: true,
    note: s.sufficiency.hasPeriod ? 'after 1 full cycle' : 'log a period first',
  }
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
    return {
      label: 'Regularity',
      value: R.label ? REGULARITY_WORDS[R.label] : DASH,
      word: true,
      note: `last ${R.cyclesUsed}: ${dayRange(R.shortest, R.longest)}`,
    }
  }
  return {
    label: 'Regularity',
    value: 'Not yet',
    word: true,
    muted: true,
    note: `needs ${MIN_CYCLES_FOR_REGULARITY} cycles (${R.cyclesNeeded} to go)`,
  }
}

// ---------------------------------------------------------------------------
// Zero logs
// ---------------------------------------------------------------------------

function EmptyStats() {
  const steps: { kind: ShapeKind; tone: Tone; n: string; text: string }[] = [
    { kind: 'star', tone: 'blue', n: '1', text: 'Check in tonight. Your habits start counting.' },
    { kind: 'heart', tone: 'pink', n: '2', text: 'Log your period (pick a flow) for cycle numbers and mood by phase.' },
    {
      kind: 'clover',
      tone: 'green',
      n: '3',
      text: `After ${MIN_CYCLES_FOR_PATTERN} periods, see if your moods shift the week before.`,
    },
  ]
  return (
    <section className="ph-card ph-stats-empty" aria-labelledby="ph-stats-empty-title">
      <h2 id="ph-stats-empty-title" className="ph-stats-empty__title">
        Nothing to count yet
      </h2>
      <p className="ph-stats-empty__lead">Your evening check-ins turn into numbers here:</p>
      <ol className="ph-steps">
        {steps.map((s) => (
          <li key={s.n} className="ph-steps__item">
            <span className={`ph-steps__badge ph-tone--${s.tone}`} aria-hidden="true">
              <Shape kind={s.kind} tone={s.tone} />
              <span>{s.n}</span>
            </span>
            <span className="ph-steps__text">{s.text}</span>
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
    <Card title="Highlights" icon="sparkle" tone="yellow" className="ph-hl-card">
      {headline ? <Headline h={headline} onShow={onShow} /> : <UnlockList s={s} off={off} />}
      {rest.length > 0 && (
        <ul className="ph-hl">
          {rest.map((h) => {
            const v = describeLine(h)
            return (
              <li key={h.type} className="ph-hl__item">
                <span className={`ph-hl__badge ph-tone--${v.tone}`} aria-hidden="true">
                  <span className="ph-hl__num">{v.badge}</span>
                  <span className="ph-hl__unit">{v.unit}</span>
                </span>
                <p className="ph-hl__text">
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
  let kind: ShapeKind = 'star'
  let tone: Tone = 'blue'
  let badge = ''
  let unit = ''
  let title: ReactNode = null
  let sub = ''
  let moods = false
  if (h.type === 'premenstrual-rise') {
    const others = h.itemsRising - 1
    kind = 'heart'
    tone = 'pink'
    badge = signed(h.difference)
    unit = 'pts'
    title = (
      <>
        <strong>{h.label}</strong> tends to run higher the week before your period
      </>
    )
    sub = `${one(h.premenstrualMean)} before vs ${one(h.postmenstrualMean)} after it starts · held in ${h.cyclesHigherBefore} of ${plural(h.cycles, 'cycle')}`
    if (others > 0) sub += ` · ${plural(others, 'other mood')} rose too`
    moods = true
  } else if (h.type === 'similar-before-and-after') {
    kind = 'clover'
    tone = 'green'
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
    <div className="ph-headline">
      <div className="ph-headline__row">
        <span className={`ph-headline__badge ph-tone--${tone}`} aria-hidden="true">
          <Shape kind={kind} tone={tone} />
          <span className="ph-headline__badge-text">
            <span className="ph-headline__num">{badge}</span>
            <span className="ph-headline__unit">{unit}</span>
          </span>
        </span>
        <div className="ph-headline__text">
          <p className="ph-headline__title">{title}</p>
          <p className="ph-headline__sub">{sub}</p>
        </div>
      </div>
      {moods && (
        <button type="button" className="ph-link ph-more" onClick={() => onShow('moods')}>
          See all moods
          <Icon name="chevron-right" size={16} />
        </button>
      )}
    </div>
  )
}

/** One short line per highlight (badge + text) for the Overview list. */
function describeLine(h: Highlight): { tone: Tone; badge: string; unit: string; text: ReactNode } {
  switch (h.type) {
    case 'premenstrual-rise':
      return { tone: 'pink', badge: signed(h.difference), unit: 'pts', text: `${h.label} higher the week before` }
    case 'similar-before-and-after':
      return { tone: 'green', badge: '≈', unit: 'steady', text: 'Moods steady before vs after your period' }
    case 'typical-cycle':
      return { tone: 'blue', badge: num(h.days), unit: 'days', text: `Typical cycle, middle of ${h.cycles}` }
    case 'cycle-regularity':
      return {
        tone: 'green',
        badge: num(h.spreadDays),
        unit: h.spreadDays === 1 ? 'day apart' : 'days apart',
        text: `${REGULARITY_WORDS[h.label]}: last ${h.cycles} cycles`,
      }
    case 'phase-symptom':
      return {
        tone: PHASE_TONE[h.phase],
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
        tone: 'yellow',
        badge: num(h.days),
        unit: 'days',
        text: h.isCurrent
          ? `You’re on a ${h.days}-day check-in streak, your best yet.`
          : `Best run so far, ${shortDate(h.start)} – ${shortDate(h.end)}`,
      }
    case 'typical-period':
      return { tone: 'pink', badge: num(h.days), unit: 'days', text: `Typical period, across ${plural(h.periods, 'period')}` }
    case 'coverage':
      return {
        tone: 'blue',
        badge: pct(h.share),
        unit: 'logged',
        text: `Checked in on ${h.daysLogged} of ${h.daysPossible} days since you started`,
      }
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
    <div className="ph-unlock">
      <div className="ph-unlock__progress">
        <span className="ph-unlock__count">
          No big finding yet · {done} of {steps.length} unlocked
        </span>
        <span className="ph-bar__track" aria-hidden="true">
          <span className="ph-bar__fill ph-fill--yellow" style={{ width: `${(done / steps.length) * 100}%` }} />
        </span>
      </div>
      <ol className="ph-unlock__list">
        {steps.map((x) => (
          <li key={x.label} className={`ph-unlock__step${x.done ? ' is-done' : ''}`}>
            <span className="ph-unlock__box" aria-hidden="true">
              {x.done && <Icon name="check" size={14} />}
            </span>
            <span className="ph-unlock__label">
              <span className="visually-hidden">{x.done ? 'Done: ' : 'To do: '}</span>
              {x.label}
              {x.note && <span className="ph-unlock__note">{x.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function KeyNumbersCard({ s, onShow }: { s: CycleStats; onShow: (v: StatsView) => void }) {
  const headline = pickHeadline(s.highlights)
  const tiles = [cycleTile(s), periodTile(s), regularityTile(s)].filter(
    (t) => !(headline?.type === 'typical-cycle' && t.label === 'Typical cycle'),
  )
  return (
    <Card title="Your cycle" icon="loop" tone="blue">
      <Tiles tiles={tiles} cols={tiles.length === 3 ? 3 : 2} />
      <button type="button" className="ph-link ph-more" onClick={() => onShow('body')}>
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
  const title = 'Before and after your period'

  if (!ba.available) {
    return (
      <Card title={title} icon="drop" tone="pink">
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
    <Card title={title} icon="drop" tone="pink">
      {!ba.enoughCycles && (
        <p className="ph-basis">
          <span className="ph-chip ph-chip--quiet">early look</span> Just {plural(ba.cyclesCompared, 'cycle')} so far: a
          first peek, not a pattern.
        </p>
      )}
      <div className="ph-db-legend" aria-hidden="true">
        <span>
          <span className="ph-db__dot ph-db__dot--before ph-db__dot--static" /> week before
        </span>
        <span>
          <span className="ph-db__dot ph-db__dot--after ph-db__dot--static" /> days 4–10
        </span>
        <span>
          1 {RATING_LABELS[1].toLowerCase()} – 6 {RATING_LABELS[6].toLowerCase()}
        </span>
      </div>
      <ul className="ph-db-list">
        {isNum(o.premenstrualMean) && isNum(o.postmenstrualMean) && isNum(o.difference) && (
          <MoodRow
            label="All moods (avg)"
            pre={o.premenstrualMean}
            post={o.postmenstrualMean}
            diff={o.difference}
            higher={o.cyclesHigherBefore}
            compared={ba.cyclesCompared}
            total
          />
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
          <li key={it.key} className="ph-db is-missing">
            <span className="ph-db__name">
              <span className="ph-db__label">{it.label}</span>
            </span>
            <span className="ph-db__none">{moodTracked(s, it.key) ? 'not enough ratings yet' : NOT_TRACKED}</span>
          </li>
        ))}
      </ul>
      <Caption>
        From {plural(ba.cyclesCompared, 'cycle')}, biggest rise first. Under each: before → after · cycles higher before.
      </Caption>
    </Card>
  )
}

function MoodRow(props: {
  label: string
  pre: number
  post: number
  diff: number
  higher: number
  compared: number
  total?: boolean
}) {
  const { label, pre, post, diff, higher, compared, total } = props
  const a = scalePos(pre)
  const b = scalePos(post)
  const lo = Math.min(a, b)
  const width = Math.abs(a - b)
  const r = Math.round(diff * 10) / 10
  const direction = r > 0 ? 'is-up' : r < 0 ? 'is-down' : 'is-flat'
  return (
    <li className={`ph-db${total ? ' ph-db--total' : ''}`}>
      <span className="ph-db__name">
        <span className="ph-db__label">{label}</span>
        <span className="ph-db__meta" aria-hidden="true">
          {one(pre)} → {one(post)} · {higher}/{compared}
        </span>
        <span className="visually-hidden">
          : {one(pre)} before, {one(post)} after, higher before in {higher} of {plural(compared, 'cycle')}.
        </span>
      </span>
      <span className="ph-db__track" aria-hidden="true">
        <span className="ph-db__ticks">
          {[0, 20, 40, 60, 80, 100].map((t) => (
            <span key={t} style={{ left: `${t}%` }} />
          ))}
        </span>
        <span className="ph-db__link" style={{ left: `${lo}%`, width: `${width}%` }} />
        <span className="ph-db__dot ph-db__dot--after" style={{ left: `${b}%` }} />
        <span className="ph-db__dot ph-db__dot--before" style={{ left: `${a}%` }} />
      </span>
      <span className={`ph-db__diff ${direction}`}>
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
  const next = postAhead && pre >= need ? 'Keep checking in through day 10.' : 'Check in each evening so your next one counts.'
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
    <details className="ph-card ph-details">
      <summary className="ph-details__summary">
        <span>Period by period ({pairs.length})</span>
        <Icon name="chevron-right" size={18} className="ph-details__chev" />
      </summary>
      <ul className="ph-pairs">
        {[...pairs].reverse().map((p) => (
          <li key={p.periodStart} className={`ph-pairs__item${p.contributes ? '' : ' is-skipped'}`}>
            <span className="ph-pairs__date">{shortDate(p.periodStart)}</span>
            <span className="ph-pairs__what">
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

/**
 * The heat ramp at `t` (0–1): from --heat-0 to --heat-1, mixed in sRGB like a plain linear
 * blend (Cream: cream to soft rose). Each colourway sets both ends so --ink stays ≥ 4.5:1.
 */
function rose(t: number): string {
  const k = Math.max(0, Math.min(1, t))
  return `color-mix(in srgb, var(--heat-1) ${Math.round(k * 1000) / 10}%, var(--heat-0))`
}

function PhaseHeaders({ withAll, thin }: { withAll?: boolean; thin: (p: Phase) => boolean }) {
  return (
    <>
      {PHASE_ORDER.map((p) => (
        <th key={p} scope="col" className="ph-heat__phase">
          <span className={`ph-heat__pill ph-tone--${PHASE_TONE[p]}`} aria-hidden="true">
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
        <th scope="col" className="ph-heat__phase">
          <span className="ph-heat__pill ph-heat__pill--all" aria-hidden="true">
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
    <p className="ph-note-line">
      {PHASE_ORDER.map((p, i) => (
        <span key={p}>
          {i > 0 && ' · '}
          {PHASE_ABBR[p]} {PHASE_LABELS[p].toLowerCase()}
        </span>
      ))}
    </p>
  )
}

function MoodByPhaseCard({ s }: { s: CycleStats }) {
  const m = s.moodByPhase
  if (!m.available) {
    return (
      <Card title="Mood by phase" icon="heart" tone="green">
        <Locked>
          <p>{m.reason ? reasonCopy(m.reason, s) : 'No check-ins inside a phase yet.'}</p>
        </Locked>
      </Card>
    )
  }
  const thin = new Map(m.phases.map((p) => [p.phase, !p.enoughData]))
  const anyThin = m.phases.some((p) => !p.enoughData)
  return (
    <Card title="Mood by phase" icon="heart" tone="green">
      <div className="ph-heat-wrap">
        <table className="ph-heat">
          <caption className="visually-hidden">Average mood rating by estimated cycle phase, from 1 (not at all) to 6 (extreme)</caption>
          <thead>
            <tr>
              <th scope="col" className="ph-heat__corner">
                <span className="visually-hidden">Mood</span>
              </th>
              <PhaseHeaders thin={(p) => thin.get(p) ?? false} />
            </tr>
          </thead>
          <tbody>
            {MOOD_ITEMS.map((item) => (
              <tr key={item.key}>
                <th scope="row" className="ph-heat__row">
                  {item.label}
                </th>
                {moodTracked(s, item.key) ? (
                  m.phases.map((p) => (
                    <HeatCell key={p.phase} mean={p.items.find((i) => i.key === item.key)?.mean ?? null} thin={!p.enoughData} />
                  ))
                ) : (
                  <td colSpan={m.phases.length} className="ph-heat__cell">
                    <span className="ph-heat__none">{NOT_TRACKED}</span>
                  </td>
                )}
              </tr>
            ))}
            <tr className="ph-heat__total">
              <th scope="row" className="ph-heat__row">
                All moods
              </th>
              {m.phases.map((p) => (
                <HeatCell key={p.phase} mean={p.overallMean} thin={!p.enoughData} />
              ))}
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="ph-heat__row">
                Days logged
              </th>
              {m.phases.map((p) => (
                <td key={p.phase} className="ph-heat__days">
                  {p.daysLogged}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <Caption>Average rating (1–6) in each estimated phase. Deeper pink = higher.</Caption>
      <PhaseKey />
      {anyThin && <Caption>* Fewer than {MIN_PHASE_DAYS} days logged (dashed), so read loosely.</Caption>}
      {m.unknownPhaseDays > 0 && (
        <Caption>
          {plural(m.unknownPhaseDays, 'logged day')} couldn’t be placed in a phase and {m.unknownPhaseDays === 1 ? 'is' : 'are'}{' '}
          left out.
        </Caption>
      )}
    </Card>
  )
}

function HeatCell({ mean, thin }: { mean: number | null; thin: boolean }) {
  if (!isNum(mean)) {
    return (
      <td className={`ph-heat__cell is-empty${thin ? ' is-thin' : ''}`}>
        <span aria-hidden="true">{DASH}</span>
        <span className="visually-hidden">no ratings</span>
      </td>
    )
  }
  return (
    <td className={`ph-heat__cell${thin ? ' is-thin' : ''}`}>
      <span className="ph-heat__val" style={{ background: rose(scalePos(mean) / 100) }}>
        {one(mean)}
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
    <Card title="Cycle numbers" icon="loop" tone="blue">
      {L.available ? (
        <>
          <Tiles
            cols={3}
            tiles={[
              cycleTile(s),
              { label: 'Shortest', value: num(L.shortest), unit: daysUnit(L.shortest) },
              { label: 'Longest', value: num(L.longest), unit: daysUnit(L.longest) },
              regularityTile(s),
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
          {s.sufficiency.hasPeriod && <Tiles cols={3} tiles={[periodTile(s), regularityTile(s), periodsTile]} />}
        </>
      )}
      {L.skippedGaps > 0 && (
        <Caption>
          {L.skippedGaps === 1
            ? '1 long gap between periods left out (likely an unlogged period).'
            : `${L.skippedGaps} long gaps between periods left out (likely unlogged periods).`}
        </Caption>
      )}
    </Card>
  )
}

const HISTORY_MAX = 12

function CycleChart({ history, typical }: { history: CompletedCycle[]; typical: number | null }) {
  const shown = history.slice(-HISTORY_MAX)
  if (shown.length === 0) return null
  const max = Math.max(...shown.map((c) => c.length), isNum(typical) ? typical : 0)
  if (!isNum(max) || max <= 0) return null
  const first = shown[0]
  const last = shown[shown.length - 1]
  return (
    <figure className="ph-cchart">
      <div className="ph-cchart__plot" aria-hidden="true">
        {isNum(typical) && <span className="ph-cchart__typical" style={{ bottom: `${(typical / max) * 100}%` }} />}
        {shown.map((c) => (
          <span key={c.start} className="ph-cchart__col">
            <span className="ph-cchart__bar" style={{ height: `${(c.length / max) * 100}%` }}>
              <span className="ph-cchart__val">{c.length}</span>
            </span>
          </span>
        ))}
      </div>
      <div className="ph-cchart__axis" aria-hidden="true">
        <span>{monthYear(first.start)}</span>
        {shown.length > 1 && <span>{monthYear(last.start)}</span>}
      </div>
      <figcaption className="ph-note-line">
        Cycle lengths{history.length > shown.length ? ` (last ${shown.length})` : ''}, oldest first
        {isNum(typical) && (
          <span aria-hidden="true">
            {' · '}
            <span className="ph-cchart__key" /> typical {num(typical)}
          </span>
        )}
      </figcaption>
      <ul className="visually-hidden">
        {shown.map((c) => (
          <li key={c.start}>
            Cycle starting {formatLongDate(c.start)}: {daysText(c.length)}
          </li>
        ))}
      </ul>
    </figure>
  )
}

function BodyCard({ s }: { s: CycleStats }) {
  const b = s.body
  return (
    <Card title="Body and lifestyle" icon="pulse" tone="yellow">
      <h3 className="ph-h3">Symptoms</h3>
      <SymptomTable s={s} />
      {!b.byPhase.available && (
        <Locked>
          <p>No phase split yet.</p>
          <p>{b.byPhase.reason ? reasonCopy(b.byPhase.reason, s) : 'No check-ins inside a phase yet.'}</p>
        </Locked>
      )}
      <h3 className="ph-h3">Sleep, energy and cravings</h3>
      <LevelsTable s={s} />
    </Card>
  )
}

/** Columns shared by both body tables: the four phases (when known) plus all days. */
function bodyColumns(s: CycleStats): { key: string; label: string; group: BodyGroup; thin: boolean }[] {
  const phases = s.body.byPhase.available
    ? s.body.byPhase.phases.map((p) => ({ key: p.phase, label: PHASE_LABELS[p.phase], group: p as BodyGroup, thin: !p.enoughData }))
    : []
  return [...phases, { key: 'all', label: 'All days', group: s.body.overall, thin: false }]
}

function BodyHead({ s, corner }: { s: CycleStats; corner: string }) {
  const thin = new Map(s.body.byPhase.phases.map((p) => [p.phase, !p.enoughData]))
  return (
    <thead>
      <tr>
        <th scope="col" className="ph-heat__corner ph-heat__corner--body">
          <span className="visually-hidden">{corner}</span>
        </th>
        {s.body.byPhase.available ? (
          <PhaseHeaders withAll thin={(p) => thin.get(p) ?? false} />
        ) : (
          <th scope="col" className="ph-heat__phase">
            <span className="ph-heat__pill ph-heat__pill--all">All days</span>
          </th>
        )}
      </tr>
    </thead>
  )
}

function SymptomTable({ s }: { s: CycleStats }) {
  const order = s.body.overall.topSymptoms
  if (order.length === 0) return <Caption>No body symptoms logged yet.</Caption>
  const cols = bodyColumns(s)
  return (
    <>
      <div className="ph-heat-wrap">
        <table className="ph-heat ph-heat--body">
          <caption className="visually-hidden">Share of logged days with each symptom, by estimated phase</caption>
          <BodyHead s={s} corner="Symptom" />
          <tbody>
            {order.map((sym) => (
              <tr key={sym.key}>
                <th scope="row" className="ph-heat__row">
                  {sym.label}
                </th>
                {cols.map((c) => {
                  const x = c.group.symptoms.find((y) => y.key === sym.key)
                  const share = x?.share ?? null
                  if (!isNum(share)) {
                    return (
                      <td key={c.key} className={`ph-heat__cell is-empty${c.thin ? ' is-thin' : ''}`}>
                        <span aria-hidden="true">{DASH}</span>
                        <span className="visually-hidden">no days yet</span>
                      </td>
                    )
                  }
                  return (
                    <td key={c.key} className={`ph-heat__cell${c.thin ? ' is-thin' : ''}${share === 0 ? ' is-zero' : ''}`}>
                      <span className="ph-heat__val ph-heat__val--pct" style={{ background: rose(share) }}>
                        {pct(share)}
                        <span className="visually-hidden">
                          {' '}
                          ({x?.count ?? 0} of {c.group.daysLogged} days)
                        </span>
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="ph-heat__row">
                Days logged
              </th>
              {cols.map((c) => (
                <td key={c.key} className="ph-heat__days">
                  {c.group.daysLogged}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <Caption>
        Share of logged days in each phase, most common first.
        {s.body.byPhase.available && s.body.byPhase.phases.some((p) => !p.enoughData) && ' * Too few days yet.'}
      </Caption>
    </>
  )
}

const LEVEL_ROWS: { title: string; levels: readonly string[]; get: (g: BodyGroup) => Record<string, number> }[] = [
  { title: 'Sleep', levels: SLEEP_LEVELS, get: (g) => g.sleep },
  { title: 'Energy', levels: ENERGY_LEVELS, get: (g) => g.energy },
  { title: 'Cravings', levels: CRAVINGS_LEVELS, get: (g) => g.cravings },
]

function LevelsTable({ s }: { s: CycleStats }) {
  const cols = bodyColumns(s)
  return (
    <>
      <div className="ph-heat-wrap">
        <table className="ph-heat ph-heat--levels">
          <caption className="visually-hidden">Sleep, energy and cravings by estimated phase</caption>
          <BodyHead s={s} corner="Measure" />
          <tbody>
            {LEVEL_ROWS.map((row) => (
              <tr key={row.title}>
                <th scope="row" className="ph-heat__row">
                  {row.title}
                  <span className="ph-lv-key" aria-hidden="true">
                    {[...row.levels].reverse().map((l) => (
                      <span key={l}>
                        <span className={`ph-lv-sw ph-lvl-${row.levels.indexOf(l)}`} />
                        {LEVEL_LABELS[l] ?? l}
                      </span>
                    ))}
                  </span>
                </th>
                {cols.map((c) => {
                  const counts = row.get(c.group)
                  const total = row.levels.reduce((n, l) => n + (counts[l] ?? 0), 0)
                  const parts = row.levels.map((l) => ({ l, share: total > 0 ? (counts[l] ?? 0) / total : 0 }))
                  const desc =
                    total > 0
                      ? `${parts.map((p) => `${LEVEL_LABELS[p.l] ?? p.l} ${pct(p.share)}`).join(', ')} of ${plural(total, 'day')}${c.thin ? ' (not enough days yet)' : ''}`
                      : 'no days yet'
                  return (
                    <td key={c.key} className={`ph-lv-cell${c.thin ? ' is-thin' : ''}`}>
                      {total > 0 ? (
                        <span className="ph-lv" role="img" aria-label={`${row.title}, ${c.label}: ${desc}`}>
                          {parts.map(
                            (p, i) =>
                              p.share > 0 && (
                                <span key={p.l} className={`ph-lv__seg ph-lvl-${i}`} style={{ height: `${p.share * 100}%` }} />
                              ),
                          )}
                        </span>
                      ) : (
                        <span className="ph-lv-none">
                          <span aria-hidden="true">{DASH}</span>
                          <span className="visually-hidden">no days yet</span>
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Caption>Each bar is that phase’s days, darkest level on top.</Caption>
    </>
  )
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

function HabitsCard({ s }: { s: CycleStats }) {
  const h = s.habits
  const c = h.coverage
  const longest = h.longestStreak
  const streakNote =
    h.currentStreak === 0 ? 'your next check-in starts one' : h.loggedToday ? 'including today' : 'check in tonight to keep it'
  const share = isNum(c.share) ? Math.max(0, Math.min(1, c.share)) * 100 : 0
  const tiles: Tile[] = [
    {
      label: 'Longest streak',
      value: String(longest.days),
      unit: daysUnit(longest.days),
      note: longest.isCurrent
        ? 'that’s this one'
        : longest.start && longest.end
          ? `${shortDate(longest.start)} – ${shortDate(longest.end)}`
          : undefined,
    },
    { label: 'Days logged', value: String(h.daysLogged), note: h.firstLogDate ? `since ${shortDate(h.firstLogDate)}` : undefined },
    { label: 'Filled in later', value: String(h.backfilledEntries), note: 'done the next day', wide: true },
  ]
  return (
    <Card title="Check-in habits" icon="clock" tone="green">
      <div className="ph-bignum">
        <span className="ph-bignum__shape" aria-hidden="true">
          <Shape kind="star" tone="yellow" />
        </span>
        <p className="ph-bignum__text">
          <span className="ph-bignum__label">Current streak</span>
          <span className="ph-bignum__value">
            {h.currentStreak}
            <span className="ph-bignum__unit"> {daysUnit(h.currentStreak)}</span>
          </span>
          <span className="ph-bignum__note">{streakNote}</span>
        </p>
      </div>
      <div className="ph-rate">
        <p className="ph-rate__head">
          <span className="ph-rate__label">Check-in rate</span>
          <span className="ph-rate__val">{isNum(c.share) ? pct(c.share) : 'Soon'}</span>
        </p>
        {isNum(c.share) ? (
          <>
            <span className="ph-bar__track" aria-hidden="true">
              <span className="ph-bar__fill ph-fill--green" style={{ width: `${share}%` }} />
            </span>
            <Caption>
              {c.daysLogged} of {c.daysPossible} days, through yesterday.
            </Caption>
          </>
        ) : (
          <Caption>Counts from tomorrow.</Caption>
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
