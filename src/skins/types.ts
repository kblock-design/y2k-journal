import type { ComponentType } from 'react'

/**
 * The skin contract (see src/skins/README.md for the full checklist).
 *
 * A skin is a folder `src/skins/<key>/` whose entry module (`index.tsx`) default-exports
 * ONE root component that takes no props and renders the entire app: loading and error
 * states, shell and navigation, all four screens, the check-in, the Safari banner and a
 * Settings control to switch skins. It gets everything from the core hooks
 * (`src/core`), starting with `useAppData()` and then `useAppController(data, reload)`.
 *
 * The entry module also imports the skin's global CSS and fonts. Only the active skin's
 * module is ever loaded, so its CSS never meets another skin's.
 */
export interface SkinModule {
  default: ComponentType
}

/** One entry in the skin registry (src/skins/index.ts). */
export interface SkinInfo {
  /** Stable id, also the folder name and the stored preference value. Never rename. */
  key: string
  /** Name shown in the theme picker. */
  label: string
  /** Browser/app title while this skin is active; defaults to the label. */
  appName?: string
  /** One short sentence for the theme picker. */
  description: string
  /**
   * Whether this skin has the virtual pet (hatching, pet, memorial, graveyard). Pet skins
   * get the "hatch before any blocking check-in" first-run rule; skins without the pet
   * block from first launch and never show pet UI. The core keeps the pet's data either way.
   */
  usesPet: boolean
  /** Lazily imports the skin's entry module (and with it the skin's CSS and fonts). */
  load: () => Promise<SkinModule>
}
