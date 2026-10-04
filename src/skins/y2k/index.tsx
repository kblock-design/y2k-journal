// Entry of the Y2K skin, loaded lazily by src/App.tsx when this skin is active.
// Order matters: fonts, then the skin stylesheet, then components (whose own CSS files
// layer on top), exactly the cascade order the skin was designed with.

// Bundled fonts, Latin subset only (served from our own origin; no network fetches; keeps the offline cache small).
import '@fontsource/silkscreen/latin-400.css'
import '@fontsource/vt323/latin-400.css'
import '@fontsource/bagel-fat-one/latin-400.css'
import '@fontsource/pacifico/latin-400.css'
import './y2k.css'
import { Y2kApp } from './App'

export default Y2kApp
