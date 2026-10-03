export type Tab = 'home' | 'calendar' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'calendar', label: 'Calendar', icon: '▦' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
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
            {t.icon}
          </span>
          <span className="tabbar__label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
