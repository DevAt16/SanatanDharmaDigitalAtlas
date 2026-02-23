import { getPanchangam, Observer } from '@ishubhamx/panchangam-js'

// Ujjain — traditional Hindu calendar meridian (23.18°N 75.77°E)
const UJJAIN = new Observer(23.18, 75.77, 0)
const IST_OFFSET = 330 // minutes

// Vara (weekday) metadata — library gives 0=Sun … 6=Sat (same as JS getDay)
const VARA_META = [
  { en: 'Sunday',    hi: 'Ravivar',   special: false, deity: null,   tags: [] },
  { en: 'Monday',    hi: 'Somvar',    special: true,  deity: 'shiva',  tags: ['Jyotirlinga'],  label: 'Somvar — auspicious for Lord Shiva' },
  { en: 'Tuesday',   hi: 'Mangalvar', special: false, deity: null,   tags: [] },
  { en: 'Wednesday', hi: 'Budhvar',   special: false, deity: null,   tags: [] },
  { en: 'Thursday',  hi: 'Guruvar',   special: false, deity: null,   tags: [] },
  { en: 'Friday',    hi: 'Shukravar', special: true,  deity: 'shakti', tags: ['Shakti Peetha'], label: 'Shukravar — auspicious for Devi' },
  { en: 'Saturday',  hi: 'Shanivar',  special: false, deity: null,   tags: [] },
]

// Format a UTC date string to IST time (e.g. "6:53 am")
function formatISTTime(utcDate) {
  if (!utcDate) return null
  return new Date(utcDate).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

// Map a festival object from the library to our circuit tags
function festivalTags(festival) {
  const name = festival.name || ''
  const cat  = festival.category || ''
  if (
    /shiva|shivaratri|pradosham|somvar/i.test(name) ||
    /shiva/i.test(cat)
  ) return ['Jyotirlinga']
  if (/kartik|dev diwali/i.test(name)) return ['Jyotirlinga']
  if (/navratri|navaratri|durga|shakti/i.test(name)) return ['Shakti Peetha']
  return []
}

// Pick the most relevant festival from today's list (major > vrat > minor)
function pickPrimaryFestival(festivals) {
  if (!festivals || !festivals.length) return null
  const priority = { major: 0, pradosham: 1, vrat: 2, minor: 3 }
  return [...festivals].sort((a, b) => {
    const pa = priority[a.category] ?? 4
    const pb = priority[b.category] ?? 4
    return pa - pb
  })[0]
}

export function getTodayContext(allTemples = []) {
  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  let panchang
  try {
    panchang = getPanchangam(today, UJJAIN, { timezoneOffset: IST_OFFSET })
  } catch {
    // Fallback: return minimal context on error
    return {
      vara: VARA_META[today.getDay()],
      festival: null,
      inShravan: false,
      recommendedTags: VARA_META[today.getDay()].tags,
      recommended: [],
      todayStr,
      tithi: null,
      nakshatra: null,
      masa: null,
      paksha: null,
      samvat: null,
      sunrise: null,
      rahuKalam: null,
    }
  }

  const vara      = VARA_META[panchang.vara]
  const masa      = panchang.masa   // { index, name, isAdhika }
  const paksha    = panchang.paksha // 'Shukla' | 'Krishna'
  const tithi     = panchang.tithiTransitions?.[0] ?? null // { name, index }
  const nakshatra = panchang.nakshatraTransitions?.[0] ?? null // { name, index }
  const samvat    = panchang.samvat ?? null // { vikram, shaka, samvatsara }
  const sunrise   = formatISTTime(panchang.sunrise)
  const rahuKalam = panchang.rahuKalamStart && panchang.rahuKalamEnd
    ? { start: formatISTTime(panchang.rahuKalamStart), end: formatISTTime(panchang.rahuKalamEnd) }
    : null

  const inShravan = masa?.name === 'Shravana'

  const primary = pickPrimaryFestival(panchang.festivals)
  const fTags   = primary ? festivalTags(primary) : []

  // Festival shape compatible with old code: { label, tags, highlight }
  const festival = primary
    ? { label: primary.name, tags: fTags, highlight: primary.category === 'major', raw: primary }
    : inShravan
    ? { label: 'Shravan Maas', tags: ['Jyotirlinga'], highlight: true }
    : null

  const recommendedTags = festival?.tags?.length ? festival.tags : vara.tags

  const recommended =
    allTemples.length && recommendedTags.length
      ? allTemples
          .filter((t) => Array.isArray(t.tags) && t.tags.some((tag) => recommendedTags.includes(tag)))
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
      : []

  return {
    vara,
    festival,
    inShravan,
    recommendedTags,
    recommended,
    todayStr,
    tithi,
    nakshatra,
    masa,
    paksha,
    samvat,
    sunrise,
    rahuKalam,
  }
}
