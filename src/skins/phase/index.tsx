// Entry of the Phase skin, loaded lazily by src/App.tsx when this skin is active.
// Fonts first, then the stylesheets (base first; the rest layer on top), then the root.

import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-600.css'
import '@fontsource/outfit/latin-700.css'
import './phase.css'
import './colourways.css'
import './checkin.css'
import './calendar.css'
import './stats.css'
import { applyDocumentLook } from './document'
import { PhaseApp } from './App'

applyDocumentLook()

export default PhaseApp
