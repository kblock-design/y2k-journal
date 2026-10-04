import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PetHealth, PetStage, PetStatus } from '../../../logic/pet'
import { PetView } from '../PetView'
import { PetSprite } from './index'

const STAGES: PetStage[] = ['egg', 'baby', 'teen', 'adult']
const HEALTHS: PetHealth[] = ['happy', 'sad', 'sick', 'critical', 'dead']

describe('pet rendering', () => {
  it('renders a sprite for every stage and health', () => {
    for (const stage of STAGES) {
      for (const health of HEALTHS) {
        const html = renderToStaticMarkup(<PetSprite stage={stage} health={health} />)
        expect(html).toContain('viewBox="0 0 28 22"')
        expect(html).toMatch(/tama-sprite__frame--a" d="M\d/)
        expect(html).toMatch(/tama-sprite__frame--b" d="M\d/)
      }
    }
  })

  it('PetView shows name, message, health, streak and age as text', () => {
    const status: PetStatus = {
      health: 'sick',
      stage: 'teen',
      missedDays: 2,
      streak: 1,
      ageDays: 12,
      diedOn: null,
      message: 'a check-in would fix me right up!',
    }
    const html = renderToStaticMarkup(<PetView status={status} name="Bubbles" />)
    expect(html).toContain('aria-label="Bubbles, sick teen"')
    expect(html).toContain('>Bubbles</h2>')
    expect(html).toContain('a check-in would fix me right up!')
    expect(html).toContain('>Sick</dd>')
    expect(html).toContain('>1 day</dd>')
    expect(html).toContain('>12 days</dd>')
    // Decorative toy is hidden from assistive tech and has nothing focusable.
    expect(html).toContain('class="tama__device" aria-hidden="true"')
    expect(html).not.toMatch(/<button|tabindex/)
  })
})
