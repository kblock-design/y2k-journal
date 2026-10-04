import { pickDaily } from '../logic/pet'
import type { ISODate } from '../types'

export interface Quote {
  text: string
  by: string
}

const QUOTES: readonly Quote[] = [
  { text: 'Well-behaved women seldom make history.', by: 'Laurel Thatcher Ulrich' },
  { text: 'On Wednesdays we wear pink.', by: 'Mean Girls' },
  { text: 'Find out who you are and do it on purpose.', by: 'Dolly Parton' },
  { text: 'What, like it’s hard?', by: 'Elle Woods, Legally Blonde' },
  { text: 'Above all, be the heroine of your life, not the victim.', by: 'Nora Ephron' },
  { text: 'If you obey all the rules, you miss all the fun.', by: 'Katharine Hepburn' },
  { text: 'Power’s not given to you. You have to take it.', by: 'Beyoncé' },
  { text: 'You only live once, but if you do it right, once is enough.', by: 'Mae West' },
  { text: 'I am not afraid of storms, for I am learning how to sail my ship.', by: 'Louisa May Alcott' },
  { text: 'The limit does not exist.', by: 'Cady Heron, Mean Girls' },
  { text: 'Life shrinks or expands in proportion to one’s courage.', by: 'Anaïs Nin' },
  { text: 'I never dreamed about success. I worked for it.', by: 'Estée Lauder' },
  { text: 'Ugh, as if!', by: 'Cher Horowitz, Clueless' },
  { text: 'I’d rather regret the things I’ve done than regret the things I haven’t done.', by: 'Lucille Ball' },
  { text: 'Nothing is impossible. The word itself says “I’m possible!”', by: 'Audrey Hepburn' },
  { text: 'I am my own experiment. I am my own work of art.', by: 'Madonna' },
  { text: 'If you want the rainbow, you gotta put up with the rain.', by: 'Dolly Parton' },
  { text: 'No one can make you feel inferior without your consent.', by: 'Eleanor Roosevelt' },
  { text: 'Whoever said orange was the new pink was seriously disturbed.', by: 'Elle Woods, Legally Blonde' },
  { text: 'Think like a queen. A queen is not afraid to fail.', by: 'Oprah Winfrey' },
  { text: 'My mission in life is not merely to survive, but to thrive.', by: 'Maya Angelou' },
  { text: 'Be a first-rate version of yourself, not a second-rate version of someone else.', by: 'Judy Garland' },
  { text: 'If a girl wants to be a legend, she should go ahead and be one.', by: 'Calamity Jane' },
  { text: 'Done is better than perfect.', by: 'Sheryl Sandberg' },
  { text: 'The most courageous act is still to think for yourself. Aloud.', by: 'Coco Chanel' },
  { text: 'You get in life what you have the courage to ask for.', by: 'Oprah Winfrey' },
  { text: 'She believed she could, so she did.', by: 'R.S. Grey' },
  { text: 'If you don’t like the road you’re walking, start paving another one.', by: 'Dolly Parton' },
  { text: 'The best protection any woman can have is courage.', by: 'Elizabeth Cady Stanton' },
  { text: 'If you’re always trying to be normal, you will never know how amazing you can be.', by: 'Maya Angelou' },
]

const FACTS = [
  'Your heart beats about 100,000 times a day.',
  'You can’t hum while holding your nose closed. Go on, try it.',
  'Spending just 20 minutes in nature has been shown to lower stress hormone levels.',
  'Valentina Tereshkova became the first woman in space in 1963.',
  'The man who designed the Pringles can had some of his ashes buried in one.',
  'A day on Venus is longer than its year.',
  'Octopuses have three hearts.',
  'The dot over a lowercase i or j is called a tittle.',
  'Your stomach lining replaces itself every few days.',
  'Studies find that doing something kind for someone else lifts your own mood too.',
  'Katherine Johnson’s hand calculations were used to double-check the computer for John Glenn’s 1962 orbit.',
  'The fax machine was invented before the telephone.',
  'Google’s name comes from “googol”, the number 1 followed by 100 zeros.',
  'Sharks have existed for longer than trees.',
  'Honey doesn’t spoil: jars found in ancient Egyptian tombs were still edible.',
  'Humans are the only animals known to blush.',
  'Hugging releases oxytocin, sometimes called the bonding hormone.',
  'Margaret Hamilton led the team that wrote the onboard flight software for the Apollo Moon landings.',
  'Nintendo was founded in 1889, as a playing-card company.',
  'The Y2K bug came from programs storing years as two digits, so 2000 looked like 1900.',
  'Bananas are very slightly radioactive, thanks to their potassium.',
  'Botanically, bananas are berries and strawberries are not.',
  'The human body gives off a tiny amount of visible light, far too faint for our eyes to see.',
  'Laughing triggers the release of endorphins, the body’s natural feel-good chemicals.',
  'Hedy Lamarr, a Hollywood star, co-invented a frequency-hopping technique that underpins modern Wi-Fi and Bluetooth.',
  'Oxford University is older than the Aztec Empire.',
  'The first iPod, in 2001, held about 1,000 songs.',
  'The Eiffel Tower grows by about 15 centimetres in summer, as the iron expands in the heat.',
  'Honeybees can learn to recognise human faces.',
  'Any two people on Earth share about 99.9% of their DNA.',
  'Body temperature rises slightly after ovulation and stays up until the next period.',
  'Ada Lovelace wrote what is often called the first computer program, in the 1840s.',
  'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.',
  'The first camera phone went on sale in Japan in 2000.',
  'There are more possible games of chess than atoms in the observable universe.',
  'Wombat poop is cube-shaped.',
  'The human body is made of roughly 37 trillion cells.',
  'A cycle anywhere from 21 to 35 days is considered typical for adults. 28 is just an average.',
  'Marie Curie is the only person to win Nobel Prizes in two different sciences.',
  'The first person to go over Niagara Falls in a barrel and survive was Annie Edson Taylor, a 63-year-old teacher, in 1901.',
  'The first text message, sent in 1992, read “Merry Christmas”.',
  'A bolt of lightning is about five times hotter than the surface of the Sun.',
  'A group of flamingos is called a flamboyance.',
  'Your brain uses about 20% of your body’s energy.',
  'A baby girl is born with all the eggs she will ever have: around one to two million.',
  '“Stressed” spelled backwards is “desserts”.',
  'The Tale of Genji, often called the world’s first novel, was written by a woman, Murasaki Shikibu, around the year 1000.',
  'Scotland’s national animal is the unicorn.',
  'Light from the Sun takes about eight minutes to reach Earth.',
  'Sea otters hold hands while they sleep so they don’t drift apart.',
] as const

export function dailyQuote(today: ISODate): Quote {
  return pickDaily(QUOTES, today)
}

export function dailyFact(today: ISODate): string {
  return pickDaily(FACTS, today)
}
