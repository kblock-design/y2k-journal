import type { Tab } from '../../core/useAppController'
import { Icon } from './icons'
import type { IconName } from './icons'

const TABS_UI: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
  todayLogged: boolean
  onCheckin: () => void
}

/**
 * A frosted silver dock with the four destinations, and beside it a round hot-pink gel
 * button: Check in (or, once today is logged, a chrome tick that reopens today to edit).
 */
export function Nav({ tab, onChange, todayLogged, onCheckin }: Props) {
  return (
    <nav className="gl-nav" aria-label="Main">
      <div className="gl-nav__dock">
        {TABS_UI.map((t) => {
          const on = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              className={`gl-nav__tab${on ? ' is-active' : ''}`}
              aria-current={on ? 'page' : undefined}
              onClick={() => onChange(t.id)}
            >
              <span className="gl-nav__icon">
                <Icon name={t.icon} size={22} />
              </span>
              <span className="gl-nav__label">{t.label}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className={`gl-nav__orb${todayLogged ? ' is-done' : ''}`}
        aria-label={todayLogged ? 'Today’s check-in is done. Edit today' : 'Check in for today'}
        onClick={onCheckin}
      >
        <Icon name={todayLogged ? 'check' : 'plus'} size={28} />
      </button>
    </nav>
  )
}
