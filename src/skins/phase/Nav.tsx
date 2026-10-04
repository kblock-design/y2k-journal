import type { Tab } from '../../core/useAppController'
import { Icon } from './icons'
import type { IconName } from './icons'

const LEFT: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
]
const RIGHT: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'stats', label: 'Stats', icon: 'stats' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
  todayLogged: boolean
  onCheckin: () => void
}

/** Floating black pill: four destinations plus the raised round Check in button in the middle. */
export function Nav({ tab, onChange, todayLogged, onCheckin }: Props) {
  const item = (t: (typeof LEFT)[number]) => (
    <button
      key={t.id}
      type="button"
      className={`ph-nav__tab${t.id === tab ? ' is-active' : ''}`}
      aria-current={t.id === tab ? 'page' : undefined}
      onClick={() => onChange(t.id)}
    >
      <span className="ph-nav__icon">
        <Icon name={t.icon} size={22} />
      </span>
      <span className="ph-nav__label">{t.label}</span>
    </button>
  )
  return (
    <nav className="ph-nav" aria-label="Main">
      {LEFT.map(item)}
      <div className="ph-nav__centre">
        <button
          type="button"
          className={`ph-nav__checkin${todayLogged ? ' is-done' : ''}`}
          aria-label={todayLogged ? 'Today’s check-in is done. Edit today' : 'Check in for today'}
          onClick={onCheckin}
        >
          <Icon name={todayLogged ? 'check' : 'plus'} size={28} />
        </button>
      </div>
      {RIGHT.map(item)}
    </nav>
  )
}
