// The "Stats" tab: numbers and patterns from the user's own check-ins.
//
// Every number comes from cycleStats() (logic/stats.ts); this file only rounds, formats and
// phrases. Copy describes patterns ("higher in the week before your period"), never conditions.
// Unavailable sections always say why and what unlocks them, never show placeholder zeros.
//
// Layout: four sub-views behind a pinned switch (Overview · Moods · Cycle & body · Habits), so
// nothing is cut but each view stays about one or two phone screens. Every block follows the
// same pattern: a short title, the key number or chart, one caption line.

import { useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
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
import type { BodyGroup, CompletedCycle, ComparisonPair, CycleStats, Highlight } from '../../logic/stats'
import type { DayLog, ISODate, Settings } from '../../types'
import { MOOD_ITEMS, RATING_LABELS } from '../../types'
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
import { ErrorBoundary } from './ErrorBoundary'
import { formatLongDate, PHASE_LABELS, plural } from '../../core/format'
import { PixelIcon } from './PixelIcon'
import { Window } from './Window'
import './stats.css'

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

  if (!stats.sufficiency.hasLogs) {
    return (
      <div className="screen screen--stats stats">
        <EmptyStats />
      </div>
    )
  }

  return (
    <div ref={screenRef} className="screen screen--stats stats">
      <ViewSwitch view={view} onChange={setView} />
      {view === 'overview' && <OverviewView s={stats} off={off} onShow={setView} onOpenSettings={onOpenSettings} />}
      {view === 'moods' && (off ? <MoodsOffWindow onOpenSettings={onOpenSettings} /> : <MoodsView s={stats} />)}
      {view === 'body' && <CycleBodyView s={stats} />}
      {view === 'habits' && (
        <ErrorBoundary label="Check-in habits">
          <HabitsWindow s={stats} />
        </ErrorBoundary>
      )}
      <p className="stats-footer">
        Estimates from your own check-ins, not a diagnosis.{' '}
        <button type="button" className="btn btn--link btn--inline" onClick={onOpenSettings}>
          Export in Settings
        </button>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function ViewSwitch({ view, onChange }: { view: StatsView; onChange: (v: StatsView) => void }) {
  return (
    <div className="stats-switch" role="group" aria-label="Stats view">
      {VIEWS.map((v) => (
        <button
          key={v.key}
          type="button"
          className={`stats-switch__btn${v.key === view ? ' is-selected' : ''}`}
          aria-pressed={v.key === view}
          onClick={() => onChange(v.key)}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

/** Window title: a readable heading for assistive tech, a filename on screen. */
function Title({ name, file }: { name: string; file: string }) {
  return (
    <>
      <span className="visually-hidden">{name}</span>
      <span aria-hidden="true">{file}</span>
    </>
  )
}

/** A "not yet" panel: what's missing and what unlocks it. */
function Locked({ children }: { children: ReactNode }) {
  return (
    <div className="stats-locked">
      <PixelIcon name="clock" scale={2} className="stats-locked__icon" />
      <div className="stats-locked__text">{children}</div>
    </div>
  )
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
    <dl className={`stats-tiles stats-tiles--${cols}`}>
      {tiles.map((t) => (
        <div key={t.label} className={`stats-tile${t.muted ? ' is-muted' : ''}${t.wide ? ' stats-tile--wide' : ''}`}>
          <dt className="stats-tile__label">{t.label}</dt>
          <dd className="stats-tile__data">
            <span className={`stats-tile__value${t.word ? ' stats-tile__value--word' : ''}`}>{t.value}</span>
            {t.unit && <span className="stats-tile__unit"> {t.unit}</span>}
            {t.note && <span className="stats-tile__note">{t.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Mood tracking is off (and nothing was ever rated): say so and point to Settings. */
function MoodsOffLine({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <p className="stats-note">
      {MOODS_OFF_COPY}{' '}
      <button type="button" className="btn btn--link btn--inline" onClick={onOpenSettings}>
        {MOODS_OFF_ACTION}
      </button>
    </p>
  )
}

/** One muted caption line under a chart or number. */
function Caption({ children }: { children: ReactNode }) {
  return <p className="stats-note">{children}</p>
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
  return (
    <Window
      tone="pastel"
      icon="chart"
      titleAs="h2"
      title={<Title name="Stats" file="stats.exe" />}
      className="stats-win stats-empty"
      status="0 check-ins found"
      stickers={[{ name: 'sparkle', corner: 'tr', size: 44, rotate: 12 }]}
    >
      <p className="stats-empty__title">Nothing to crunch yet</p>
      <p className="stats-empty__lead">Your nightly check-ins turn into numbers here:</p>
      <ol className="stats-steps">
        <li>
          <span className="stats-steps__num" aria-hidden="true">1</span>
          <span>Check in tonight. Your habits start counting.</span>
        </li>
        <li>
          <span className="stats-steps__num" aria-hidden="true">2</span>
          <span>Log your period (pick a flow) for cycle numbers and mood by phase.</span>
        </li>
        <li>
          <span className="stats-steps__num" aria-hidden="true">3</span>
          <span>After {MIN_CYCLES_FOR_PATTERN} periods, see if your moods shift the week before.</span>
        </li>
      </ol>
    </Window>
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

function OverviewView({
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
  const tiles = [cycleTile(s), periodTile(s), regularityTile(s)].filter(
    (t) => !(headline?.type === 'typical-cycle' && t.label === 'Typical cycle'),
  )
  return (
    <>
      <ErrorBoundary label="Highlights">
        <Window
          tone="pink"
          icon="star"
          titleAs="h2"
          title={<Title name="Highlights" file="highlights.txt" />}
          className="stats-win stats-highlights"
          status={s.highlights.length ? `${plural(s.highlights.length, 'highlight')} found` : 'Scanning…'}
          stickers={[{ name: 'sparkle', corner: 'tr', size: 42, rotate: 12 }]}
        >
          {headline ? <Headline h={headline} onShow={onShow} /> : <UnlockList s={s} off={off} />}
          {rest.length > 0 && (
            <ul className="stats-hl">
              {rest.map((h) => {
                const v = describeLine(h)
                return (
                  <li key={h.type} className="stats-hl__item">
                    <span className="stats-hl__badge" aria-hidden="true">
                      <span className="stats-hl__num">{v.badge}</span>
                      <span className="stats-hl__unit">{v.unit}</span>
                    </span>
                    <p className="stats-hl__text">
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
        </Window>
      </ErrorBoundary>
      <ErrorBoundary label="Your cycle">
        <Window
          tone="blue"
          icon="calendar"
          titleAs="h2"
          title={<Title name="Your cycle" file="my_cycle.xls" />}
          className="stats-win stats-keynums"
        >
          <Tiles tiles={tiles} cols={tiles.length === 3 ? 3 : 2} />
          <p className="stats-note stats-more">
            <button type="button" className="btn btn--link btn--inline stats-more__btn" onClick={() => onShow('body')}>
              All cycle numbers and body stats
            </button>
          </p>
        </Window>
      </ErrorBoundary>
    </>
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
        <strong>{h.label}</strong> runs higher the week before your period
      </>
    )
    sub = `${one(h.premenstrualMean)} before vs ${one(h.postmenstrualMean)} after it starts · higher in ${h.cyclesHigherBefore} of ${plural(h.cycles, 'cycle')}`
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
    title = `Your cycle usually runs about ${daysText(h.days)}`
    sub = `The middle of ${plural(h.cycles, 'cycle')}`
  }
  return (
    <div className="stats-head">
      <div className="stats-head__row">
        <span className="stats-head__badge" aria-hidden="true">
          <span className="stats-head__num">{badge}</span>
          <span className="stats-head__unit">{unit}</span>
        </span>
        <p className="stats-head__title">{title}</p>
      </div>
      <p className="stats-head__sub">{sub}</p>
      {moods && (
        <button type="button" className="btn btn--link btn--inline stats-more__btn" onClick={() => onShow('moods')}>
          See all moods
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
      return {
        badge: num(h.spreadDays),
        unit: 'day spread',
        text: `${REGULARITY_WORDS[h.label]}: last ${h.cycles} cycles`,
      }
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
        text: h.isCurrent
          ? `You're on a ${h.days}-day check-in streak, your best yet`
          : `Longest streak, ${shortDate(h.start)} – ${shortDate(h.end)}`,
      }
    case 'typical-period':
      return { badge: num(h.days), unit: 'days', text: `Typical period, across ${plural(h.periods, 'period')}` }
    case 'coverage':
      return {
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
    {
      done: q.hasCycleLengths,
      label: 'Finish one full cycle',
      note: q.hasCycleLengths ? null : 'one period start to the next',
    },
    {
      mood: true,
      done: q.hasComparison,
      label: 'Get a before-vs-after look',
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
    <div className="stats-unlock">
      <p className="stats-unlock__lead">
        No big finding yet. {done} of {steps.length} unlocked:
      </p>
      <ol className="stats-unlock__list">
        {steps.map((x) => (
          <li key={x.label} className={`stats-unlock__step${x.done ? ' is-done' : ''}`}>
            <span className="stats-unlock__box" aria-hidden="true">
              {x.done && <PixelIcon name="check" scale={1.5} />}
            </span>
            <span className="stats-unlock__label">
              <span className="visually-hidden">{x.done ? 'Done: ' : 'To do: '}</span>
              {x.label}
              {x.note && <span className="stats-unlock__note">{x.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Moods: before vs after (all moods), mood by phase, period by period
// ---------------------------------------------------------------------------

/** The Moods view while mood tracking is off and nothing was ever rated. */
function MoodsOffWindow({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Window
      tone="lilac"
      icon="heart"
      titleAs="h2"
      title={<Title name="Moods" file="moods.exe" />}
      className="stats-win stats-ba"
      status="Mood tracking: off"
    >
      <MoodsOffLine onOpenSettings={onOpenSettings} />
    </Window>
  )
}

function MoodsView({ s }: { s: CycleStats }) {
  const ba = s.beforeAfter
  return (
    <>
      <ErrorBoundary label="Before vs after">
        <BeforeAfterWindow s={s} />
      </ErrorBoundary>
      <ErrorBoundary label="Mood by phase">
        <MoodByPhaseWindow s={s} />
      </ErrorBoundary>
      {ba.available && ba.pairs.length > 0 && (
        <ErrorBoundary label="Period by period">
          <PeriodByPeriod pairs={ba.pairs} today={s.today} />
        </ErrorBoundary>
      )}
    </>
  )
}

function BeforeAfterWindow({ s }: { s: CycleStats }) {
  const ba = s.beforeAfter
  const shell = (children: ReactNode, status: string) => (
    <Window
      tone="lilac"
      icon="heart"
      titleAs="h2"
      title={<Title name="Before vs after your period" file="before_vs_after.exe" />}
      className="stats-win stats-ba"
      status={status}
      stickers={[{ name: 'butterfly', corner: 'br', size: 46, rotate: -12 }]}
    >
      {children}
    </Window>
  )

  if (!ba.available) {
    return shell(
      <>
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
      </>,
      'Waiting for data…',
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

  return shell(
    <>
      {!ba.enoughCycles && (
        <p className="stats-basis">
          <span className="stats-tag">early look</span> Just {plural(ba.cyclesCompared, 'cycle')} so far: a first
          peek, not a pattern.
        </p>
      )}
      <div className="stats-db-legend" aria-hidden="true">
        <span className="stats-db-legend__item">
          <span className="stats-db__dot stats-db__dot--before stats-db__dot--static" /> week before
        </span>
        <span className="stats-db-legend__item">
          <span className="stats-db__dot stats-db__dot--after stats-db__dot--static" /> days 4–10
        </span>
        <span className="stats-db-legend__item">
          1 {RATING_LABELS[1].toLowerCase()} – 6 {RATING_LABELS[6].toLowerCase()}
        </span>
      </div>
      <ul className="stats-db-list">
        <li className="stats-db stats-db--scale" aria-hidden="true">
          <span />
          <span className="stats-db-scale">
            <span>1</span>
            <span>6</span>
          </span>
          <span />
        </li>
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
          <li key={it.key} className="stats-db is-missing">
            <span className="stats-db__name">
              <span className="stats-db__label">{it.label}</span>
            </span>
            <span className="stats-db__none">{moodTracked(s, it.key) ? 'not enough ratings yet' : NOT_TRACKED}</span>
          </li>
        ))}
      </ul>
      <Caption>
        From {plural(ba.cyclesCompared, 'cycle')}, biggest rise first. Under each: before → after · cycles higher
        before.
      </Caption>
    </>,
    `${ba.cyclesCompared} of ${plural(ba.pairs.length, 'period')} compared`,
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
    <li className={`stats-db${total ? ' stats-db--total' : ''}`}>
      <span className="stats-db__name">
        <span className="stats-db__label">{label}</span>
        <span className="stats-db__meta" aria-hidden="true">
          {one(pre)} → {one(post)} · {higher}/{compared}
        </span>
        <span className="visually-hidden">
          : {one(pre)} before, {one(post)} after, higher before in {higher} of {plural(compared, 'cycle')}.
        </span>
      </span>
      <span className="stats-db__track" aria-hidden="true">
        <span className="stats-db__link" style={{ left: `${lo}%`, width: `${width}%` }} />
        <span className="stats-db__dot stats-db__dot--after" style={{ left: `${b}%` }} />
        <span className="stats-db__dot stats-db__dot--before" style={{ left: `${a}%` }} />
      </span>
      <span className={`stats-db__diff ${direction}`}>
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
    <details className="stats-pairs">
      <summary className="stats-pairs__summary">Period by period ({pairs.length})</summary>
      <ul className="stats-pairs__list">
        {[...pairs].reverse().map((p) => (
          <li key={p.periodStart} className={`stats-pairs__item${p.contributes ? '' : ' is-skipped'}`}>
            <span className="stats-pairs__date">{shortDate(p.periodStart)}</span>
            <span className="stats-pairs__what">
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
        <th key={p} scope="col" className={`stats-heat__phase stats-heat__phase--${p}${thin(p) ? ' is-thin' : ''}`}>
          <span aria-hidden="true">{PHASE_ABBR[p]}</span>
          <span className="visually-hidden">
            {PHASE_LABELS[p]}
            {thin(p) ? ', not enough days yet' : ''}
          </span>
        </th>
      ))}
      {withAll && (
        <th scope="col" className="stats-heat__phase stats-heat__phase--all">
          <span aria-hidden="true">All</span>
          <span className="visually-hidden">All days</span>
        </th>
      )}
    </>
  )
}

function PhaseKey() {
  return (
    <p className="stats-note">
      {PHASE_ORDER.map((p, i) => (
        <span key={p}>
          {i > 0 && ' · '}
          {PHASE_ABBR[p]} {PHASE_LABELS[p].toLowerCase()}
        </span>
      ))}
    </p>
  )
}

function MoodByPhaseWindow({ s }: { s: CycleStats }) {
  const m = s.moodByPhase
  const shell = (children: ReactNode) => (
    <Window
      tone="pastel"
      icon="note"
      titleAs="h2"
      title={<Title name="Mood by phase" file="mood_by_phase.xls" />}
      className="stats-win stats-mood"
      status="Phases are estimates"
    >
      {children}
    </Window>
  )

  if (!m.available) {
    return shell(
      <Locked>
        <p>{m.reason ? reasonCopy(m.reason, s) : 'No check-ins inside a phase yet.'}</p>
      </Locked>,
    )
  }

  const thin = new Map(m.phases.map((p) => [p.phase, !p.enoughData]))
  const anyThin = m.phases.some((p) => !p.enoughData)
  return shell(
    <>
      <table className="stats-heat">
        <caption className="visually-hidden">
          Average mood rating by estimated cycle phase, from 1 (not at all) to 6 (extreme)
        </caption>
        <thead>
          <tr>
            <th scope="col" className="stats-heat__corner">
              Mood
            </th>
            <PhaseHeaders thin={(p) => thin.get(p) ?? false} />
          </tr>
        </thead>
        <tbody>
          {MOOD_ITEMS.map((item) => (
            <tr key={item.key}>
              <th scope="row" className="stats-heat__row">
                {item.label}
              </th>
              {moodTracked(s, item.key) ? (
                m.phases.map((p) => (
                  <HeatCell key={p.phase} mean={p.items.find((i) => i.key === item.key)?.mean ?? null} thin={!p.enoughData} />
                ))
              ) : (
                <td colSpan={m.phases.length} className="stats-heat__cell is-empty stats-heat__untracked">
                  {NOT_TRACKED}
                </td>
              )}
            </tr>
          ))}
          <tr className="stats-heat__total">
            <th scope="row" className="stats-heat__row">
              All moods
            </th>
            {m.phases.map((p) => (
              <HeatCell key={p.phase} mean={p.overallMean} thin={!p.enoughData} />
            ))}
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="stats-heat__row">
              Days logged
            </th>
            {m.phases.map((p) => (
              <td key={p.phase} className={`stats-heat__days${p.enoughData ? '' : ' is-thin'}`}>
                {p.daysLogged}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <Caption>Average rating (1–6) in each estimated phase. Darker = higher.</Caption>
      <PhaseKey />
      {anyThin && <Caption>Faded: fewer than {MIN_PHASE_DAYS} days logged, so read loosely.</Caption>}
      {m.unknownPhaseDays > 0 && (
        <Caption>
          {plural(m.unknownPhaseDays, 'logged day')} couldn't be placed in a phase and{' '}
          {m.unknownPhaseDays === 1 ? 'is' : 'are'} left out.
        </Caption>
      )}
    </>,
  )
}

function HeatCell({ mean, thin }: { mean: number | null; thin: boolean }) {
  if (!isNum(mean)) {
    return (
      <td className={`stats-heat__cell is-empty${thin ? ' is-thin' : ''}`}>
        <span aria-hidden="true">{DASH}</span>
        <span className="visually-hidden">no ratings</span>
      </td>
    )
  }
  // Tint strength follows the rating: 1 → none, 6 → strongest.
  const strength = Math.round((scalePos(mean) / 100) * 70)
  return (
    <td
      className={`stats-heat__cell${thin ? ' is-thin' : ''}${strength >= 45 ? ' is-strong' : ''}`}
      style={{ '--stats-heat': `${strength}%` } as CSSProperties}
    >
      {one(mean)}
    </td>
  )
}

// ---------------------------------------------------------------------------
// Cycle & body
// ---------------------------------------------------------------------------

function CycleBodyView({ s }: { s: CycleStats }) {
  return (
    <>
      <ErrorBoundary label="Cycle numbers">
        <CycleNumbersWindow s={s} />
      </ErrorBoundary>
      <ErrorBoundary label="Body and lifestyle">
        <BodyWindow s={s} />
      </ErrorBoundary>
    </>
  )
}

function CycleNumbersWindow({ s }: { s: CycleStats }) {
  const { lengths: L, periodsLogged } = s.cycles
  const periodsTile: Tile = { label: 'Periods logged', value: String(periodsLogged) }

  return (
    <Window
      tone="blue"
      icon="calendar"
      titleAs="h2"
      title={<Title name="Cycle numbers" file="cycle_numbers.xls" />}
      className="stats-win stats-cycles"
      status={L.available ? `${plural(L.count, 'cycle')} on file` : `${plural(periodsLogged, 'period')} on file`}
    >
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
    </Window>
  )
}

const CHART_MAX_BARS = 12

function CycleChart({ history, typical }: { history: CompletedCycle[]; typical: number | null }) {
  const shown = history.slice(-CHART_MAX_BARS)
  if (shown.length === 0) return null
  const max = Math.max(...shown.map((c) => c.length), isNum(typical) ? typical : 0)
  if (!isNum(max) || max <= 0) return null
  const first = shown[0]
  const last = shown[shown.length - 1]
  return (
    <figure className="stats-chart">
      <div className="stats-chart__plot" aria-hidden="true">
        {isNum(typical) && <span className="stats-chart__typical" style={{ bottom: `${(typical / max) * 100}%` }} />}
        {shown.map((c) => (
          <span key={c.start} className="stats-chart__col">
            <span className="stats-chart__bar" style={{ height: `${(c.length / max) * 100}%` }}>
              <span className="stats-chart__val">{c.length}</span>
            </span>
          </span>
        ))}
      </div>
      <div className="stats-chart__axis" aria-hidden="true">
        <span>{monthYear(first.start)}</span>
        {shown.length > 1 && <span>{monthYear(last.start)}</span>}
      </div>
      <figcaption className="stats-note">
        Cycle lengths{history.length > shown.length ? ` (last ${shown.length})` : ''}, oldest first
        {isNum(typical) && (
          <span aria-hidden="true">
            {' · '}
            <span className="stats-chart__key-line" /> typical {num(typical)}
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

function BodyWindow({ s }: { s: CycleStats }) {
  const b = s.body
  return (
    <Window
      tone="pink"
      icon="heart"
      titleAs="h2"
      title={<Title name="Body and lifestyle" file="body_stuff.txt" />}
      className="stats-win stats-body"
      status={`${plural(b.overall.daysLogged, 'day')} of notes`}
      stickers={[{ name: 'cherry', corner: 'br', size: 40, rotate: 10 }]}
    >
      <h3 className="stats-sub">Symptoms</h3>
      <SymptomTable s={s} />
      {!b.byPhase.available && (
        <Locked>
          <p>No phase split yet.</p>
          <p>{b.byPhase.reason ? reasonCopy(b.byPhase.reason, s) : 'No check-ins inside a phase yet.'}</p>
        </Locked>
      )}
      <h3 className="stats-sub">Sleep, energy and cravings</h3>
      <LevelsTable s={s} />
    </Window>
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
        <th scope="col" className="stats-heat__corner">
          {corner}
        </th>
        {s.body.byPhase.available ? (
          <PhaseHeaders withAll thin={(p) => thin.get(p) ?? false} />
        ) : (
          <th scope="col" className="stats-heat__phase stats-heat__phase--all">
            All days
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
      <table className="stats-heat stats-heat--body">
        <caption className="visually-hidden">Share of logged days with each symptom, by estimated phase</caption>
        <BodyHead s={s} corner="Symptom" />
        <tbody>
          {order.map((sym) => (
            <tr key={sym.key}>
              <th scope="row" className="stats-heat__row">
                {sym.label}
              </th>
              {cols.map((c) => {
                const x = c.group.symptoms.find((y) => y.key === sym.key)
                const share = x?.share ?? null
                if (!isNum(share)) {
                  return (
                    <td key={c.key} className={`stats-heat__cell is-empty${c.thin ? ' is-thin' : ''}`}>
                      <span aria-hidden="true">{DASH}</span>
                      <span className="visually-hidden">no days yet</span>
                    </td>
                  )
                }
                const strength = Math.round(Math.max(0, Math.min(1, share)) * 70)
                return (
                  <td
                    key={c.key}
                    className={`stats-heat__cell stats-heat__cell--pct${c.thin ? ' is-thin' : ''}${share === 0 ? ' is-zero' : ''}${strength >= 45 ? ' is-strong' : ''}`}
                    style={{ '--stats-heat': `${strength}%` } as CSSProperties}
                  >
                    {pct(share)}
                    <span className="visually-hidden">
                      {' '}
                      ({x?.count ?? 0} of {c.group.daysLogged} days)
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="stats-heat__row">
              Days logged
            </th>
            {cols.map((c) => (
              <td key={c.key} className={`stats-heat__days${c.thin ? ' is-thin' : ''}`}>
                {c.group.daysLogged}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <Caption>
        Share of logged days in each phase. Most common first.
        {s.body.byPhase.available && s.body.byPhase.phases.some((p) => !p.enoughData) && ' Faded: too few days yet.'}
      </Caption>
    </>
  )
}

const LEVEL_ROWS = [
  { title: 'Sleep', levels: SLEEP_LEVELS as readonly string[], get: (g: BodyGroup) => g.sleep as Record<string, number> },
  { title: 'Energy', levels: ENERGY_LEVELS as readonly string[], get: (g: BodyGroup) => g.energy as Record<string, number> },
  {
    title: 'Cravings',
    levels: CRAVINGS_LEVELS as readonly string[],
    get: (g: BodyGroup) => g.cravings as Record<string, number>,
  },
]

function LevelsTable({ s }: { s: CycleStats }) {
  const cols = bodyColumns(s)
  return (
    <>
      <table className="stats-heat stats-heat--levels">
        <caption className="visually-hidden">Sleep, energy and cravings by estimated phase</caption>
        <BodyHead s={s} corner="" />
        <tbody>
          {LEVEL_ROWS.map((row) => (
            <tr key={row.title}>
              <th scope="row" className="stats-heat__row">
                {row.title}
                <span className="stats-lv-key" aria-hidden="true">
                  {[...row.levels].reverse().map((l) => (
                    <span key={l}>
                      <span className={`stats-lv-sw stats-seg--${row.levels.indexOf(l)}`} />
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
                  <td key={c.key} className={`stats-lv-cell${c.thin ? ' is-thin' : ''}`}>
                    {total > 0 ? (
                      <span className="stats-lv" role="img" aria-label={`${row.title}, ${c.label}: ${desc}`}>
                        {parts.map(
                          (p, i) =>
                            p.share > 0 && (
                              <span
                                key={p.l}
                                className={`stats-lv__seg stats-seg--${i}`}
                                style={{ height: `${p.share * 100}%` }}
                              />
                            ),
                        )}
                      </span>
                    ) : (
                      <span className="stats-lv-none">
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
      <Caption>Each bar is that phase's days, darkest level on top.</Caption>
    </>
  )
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------

function HabitsWindow({ s }: { s: CycleStats }) {
  const h = s.habits
  const c = h.coverage
  const longest = h.longestStreak
  const tiles: Tile[] = [
    isNum(c.share)
      ? { label: 'Check-in rate', value: pct(c.share), note: `${c.daysLogged} of ${c.daysPossible} days, through yesterday`, wide: true }
      : { label: 'Check-in rate', value: 'Soon', word: true, muted: true, note: 'Counts from tomorrow.', wide: true },
    {
      label: 'Current streak',
      value: String(h.currentStreak),
      unit: daysUnit(h.currentStreak),
      note: h.currentStreak === 0 ? 'next check-in starts one' : h.loggedToday ? 'including today' : 'check in tonight to keep it',
    },
    {
      label: 'Longest streak',
      value: String(longest.days),
      unit: daysUnit(longest.days),
      note: longest.isCurrent
        ? "that's this one"
        : longest.start && longest.end
          ? `${shortDate(longest.start)} – ${shortDate(longest.end)}`
          : undefined,
    },
    { label: 'Days logged', value: String(h.daysLogged), note: h.firstLogDate ? `since ${shortDate(h.firstLogDate)}` : undefined },
    { label: 'Filled in later', value: String(h.backfilledEntries), note: 'done the next day' },
  ]
  return (
    <Window
      tone="blue"
      icon="clock"
      titleAs="h2"
      title={<Title name="Check-in habits" file="habits.log" />}
      className="stats-win stats-habits"
      status={h.lastLogDate ? `Last check-in: ${shortDate(h.lastLogDate)}` : 'No check-ins yet'}
    >
      <Tiles tiles={tiles} />
      {h.futureEntriesIgnored > 0 && (
        <Caption>
          {h.futureEntriesIgnored === 1
            ? "1 entry dated in the future isn't counted yet."
            : `${h.futureEntriesIgnored} entries dated in the future aren't counted yet.`}
        </Caption>
      )}
    </Window>
  )
}
