import type { SkinInfo } from './types'

export type { SkinInfo, SkinModule } from './types'

/**
 * Every skin the app can switch between, in theme-picker order.
 *
 * Adding a skin: create `src/skins/<key>/index.tsx` (default export = root component, see
 * README.md), then add ONE entry here, e.g.
 *
 *   { key: 'editorial', label: 'Editorial', description: '…', usesPet: false,
 *     load: () => import('./editorial') },
 *
 * The dynamic import() makes Vite build each skin (with its CSS and fonts) as its own chunk,
 * loaded only when that skin is active.
 */
export const SKINS: readonly SkinInfo[] = [
  {
    key: 'phase',
    label: 'Phase',
    description: 'Soft, modern app with pastel shapes.',
    usesPet: false,
    load: () => import('./phase'),
  },
  {
    key: 'gloss',
    label: 'Gloss',
    description: 'Modern and minimal with a chrome, early-2000s shine.',
    usesPet: false,
    load: () => import('./gloss'),
  },
  {
    key: 'y2k',
    label: 'Y2K',
    appName: 'The Burn Book',
    description: 'Chrome desktop collage with stickers and a pocket pet.',
    usesPet: true,
    load: () => import('./y2k'),
  },
]

/** Used on first launch and whenever the stored skin no longer exists. */
export const DEFAULT_SKIN = 'phase'
