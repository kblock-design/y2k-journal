import { useSyncExternalStore } from 'react'

// Per-device preferences (skin choice, a skin's own appearance options). They live in
// localStorage, never in the journal's database or its backups. Storage can be missing or
// throw (private mode, blocked site data); every read falls back to the default and every
// write is best-effort.

/** A string preference restricted to a fixed list of options. */
export interface Pref<T extends string> {
  get: () => T
  set: (value: T) => void
  subscribe: (notify: () => void) => () => void
}

/**
 * Creates a preference backed by `localStorage[storageKey]`. Stored values not in `options`
 * are ignored (the fallback is used). `onChange` runs after every `set`. Call it once at
 * module scope and share the result.
 *
 * @example
 * const density = createPref('burn-book:my-skin-density', [{ key: 'cosy' }, { key: 'compact' }], 'cosy')
 * export const useDensity = () => usePref(density)
 */
export function createPref<T extends string>(
  storageKey: string,
  options: readonly { key: T }[],
  fallback: T,
  onChange?: (value: T) => void,
): Pref<T> {
  const listeners = new Set<() => void>()
  const isOption = (value: string | null): value is T => options.some((o) => o.key === value)

  let current: T = fallback
  try {
    const stored = localStorage.getItem(storageKey)
    if (isOption(stored)) current = stored
  } catch {
    // Storage unavailable: use the default.
  }

  return {
    get: () => current,
    set: (value) => {
      try {
        localStorage.setItem(storageKey, value)
      } catch {
        // Storage unavailable: the choice just won't survive a reload.
      }
      current = value
      onChange?.(value)
      listeners.forEach((notify) => notify())
    },
    subscribe: (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
  }
}

/**
 * Subscribes a component to a preference; re-renders when it changes. The same getter is the
 * server snapshot, so static rendering (tests) sees the current value too.
 */
export function usePref<T extends string>(pref: Pref<T>): T {
  return useSyncExternalStore(pref.subscribe, pref.get, pref.get)
}
