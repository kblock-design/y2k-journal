// Entry of the Gloss skin, loaded lazily by src/App.tsx when this skin is active.
// Fonts first, then the stylesheets (base first; the rest layer on top), then the root.

import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-700.css'
import '@fontsource/orbitron/latin-700.css'
import '@fontsource/orbitron/latin-900.css'
import '@fontsource/silkscreen/latin-400.css'
import '@fontsource/vt323/latin-400.css'
import './gloss.css'
import './home.css'
import './checkin.css'
import './calendar.css'
import './stats.css'
import './settings.css'
import './colourways.css'
import { applyDocumentLook } from './document'
import { GlossApp } from './App'

applyDocumentLook()

export default GlossApp
