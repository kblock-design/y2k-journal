import type { Tab } from '../../core/useAppController'
import { PixelIcon } from './PixelIcon'
import type { PixelIconName } from './PixelIcon'

const TABS: { id: Tab; label: string; icon: PixelIconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tabbar__tab tabbar__tab--${t.id}${t.id === tab ? ' is-active' : ''}`}
          aria-current={t.id === tab ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          <span className="tabbar__icon" aria-hidden="true">
            <PixelIcon name={t.icon} />
          </span>
          <span className="tabbar__label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
