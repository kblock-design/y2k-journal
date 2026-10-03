import { pickDaily } from '../logic/pet'
import type { ISODate } from '../types'

const QUOTES = [
  'Be gentle with yourself. You’re doing the best you can.',
  'Feelings are visitors. Let them come and go.',
  'Small steps still count as moving.',
  'You don’t have to be sparkly every day to be a star.',
  'Rest is productive too.',
  'Today’s mood is not forever’s mood.',
  'You’ve made it through every hard day so far.',
  'Drink some water, unclench your jaw, you’ve got this.',
  'Progress, not perfection.',
  'Your pace is the right pace.',
  'It’s okay to log off and lie down.',
  'One check-in at a time.',
  'Be your own hype squad today.',
  'Soft days are still good days.',
] as const

const FACTS = [
  'Your heart beats about 100,000 times a day.',
  'A baby girl is born with all the eggs she will ever have: around one to two million.',
  'Hugging releases oxytocin, sometimes called the bonding hormone.',
  'A cycle anywhere from 21 to 35 days is considered typical for adults. 28 is just an average.',
  'Body temperature rises slightly after ovulation and stays up until the next period.',
  'Period cramps come from the uterus contracting, triggered by chemicals called prostaglandins.',
  'The uterus is about the size of a pear, and can stretch to hold a full-term baby.',
  'On average, women’s hearts beat slightly faster than men’s.',
  'Your brain uses about 20% of your body’s energy.',
  'The human body is made of roughly 37 trillion cells.',
  'Any two people on Earth share about 99.9% of their DNA.',
  'Laughing triggers the release of endorphins, the body’s natural feel-good chemicals.',
  'Studies find that doing something kind for someone else lifts your own mood too.',
  'Spending just 20 minutes in nature has been shown to lower stress hormone levels.',
  'The human body gives off a tiny amount of visible light, far too faint for our eyes to see.',
  'Humans are the only animals known to blush.',
  'Marie Curie is the only person to win Nobel Prizes in two different sciences.',
  'Ada Lovelace wrote what is often called the first computer program, in the 1840s.',
  'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.',
  'Sharks have existed for longer than trees.',
  'A day on Venus is longer than its year.',
  'Octopuses have three hearts.',
  'Botanically, bananas are berries and strawberries are not.',
  'Honey doesn’t spoil: jars found in ancient Egyptian tombs were still edible.',
] as const

export function dailyQuote(today: ISODate): string {
  return pickDaily(QUOTES, today)
}

export function dailyFact(today: ISODate): string {
  return pickDaily(FACTS, today)
}
