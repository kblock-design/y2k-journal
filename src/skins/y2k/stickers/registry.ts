import type { StickerName } from './names'
import type { StickerArt } from './svg'
import { Alien } from './art/alien'
import { Bolt } from './art/bolt'
import { Boombox } from './art/boombox'
import { Butterfly } from './art/butterfly'
import { Cassette } from './art/cassette'
import { Cd } from './art/cd'
import { Cherry } from './art/cherry'
import { ChromeBolt } from './art/chromeBolt'
import { ChromeButterfly } from './art/chromeButterfly'
import { ChromeCherry } from './art/chromeCherry'
import { ChromeCross } from './art/chromeCross'
import { ChromeCursor } from './art/chromeCursor'
import { ChromeFlame } from './art/chromeFlame'
import { ChromeHeart } from './art/chromeHeart'
import { ChromeLips } from './art/chromeLips'
import { ChromeSmiley } from './art/chromeSmiley'
import { ChromeSparkle } from './art/chromeSparkle'
import { ChromeStar } from './art/chromeStar'
import { Cursor } from './art/cursor'
import { DiscoBall } from './art/discoBall'
import { FlipPhone } from './art/flipPhone'
import { Floppy } from './art/floppy'
import { Flower } from './art/flower'
import { Gem } from './art/gem'
import { GemEmerald } from './art/gemEmerald'
import { GemMarquise } from './art/gemMarquise'
import { GemOval } from './art/gemOval'
import { GemPear } from './art/gemPear'
import { GemPrincess } from './art/gemPrincess'
import { GemRound } from './art/gemRound'
import { GemStar } from './art/gemStar'
import { GemTrillion } from './art/gemTrillion'
import { Headphones } from './art/headphones'
import { Heart } from './art/heart'
import { LipGloss } from './art/lipGloss'
import { Lips } from './art/lips'
import { NailPolish } from './art/nailPolish'
import { PixelHeart } from './art/pixelHeart'
import { Smiley } from './art/smiley'
import { Sparkle } from './art/sparkle'
import { Star } from './art/star'
import { StarShades } from './art/starShades'

/** Sticker name -> art component (each carries its own `viewBox`). */
export const ART: Record<StickerName, StickerArt> = {
  heart: Heart,
  star: Star,
  sparkle: Sparkle,
  butterfly: Butterfly,
  flower: Flower,
  smiley: Smiley,
  gem: Gem,
  lips: Lips,
  cd: Cd,
  flipPhone: FlipPhone,
  cassette: Cassette,
  cherry: Cherry,
  chromeStar: ChromeStar,
  cursor: Cursor,
  lipGloss: LipGloss,
  discoBall: DiscoBall,
  starShades: StarShades,
  floppy: Floppy,
  headphones: Headphones,
  boombox: Boombox,
  alien: Alien,
  bolt: Bolt,
  pixelHeart: PixelHeart,
  nailPolish: NailPolish,
  chromeHeart: ChromeHeart,
  chromeSparkle: ChromeSparkle,
  chromeBolt: ChromeBolt,
  chromeButterfly: ChromeButterfly,
  chromeLips: ChromeLips,
  chromeFlame: ChromeFlame,
  chromeSmiley: ChromeSmiley,
  chromeCursor: ChromeCursor,
  chromeCross: ChromeCross,
  chromeCherry: ChromeCherry,
  gemRound: GemRound,
  gemEmerald: GemEmerald,
  gemPear: GemPear,
  gemMarquise: GemMarquise,
  gemPrincess: GemPrincess,
  gemOval: GemOval,
  gemTrillion: GemTrillion,
  gemStar: GemStar,
}
