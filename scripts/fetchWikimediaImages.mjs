import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { normalizeText } from './templeDuplicateUtils.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const explicitDate = args.find((arg) => arg.startsWith('--date='))?.slice('--date='.length)
const includeAllToday = args.includes('--all-today')
const maxRecordsArg = args.find((arg) => arg.startsWith('--max-records='))?.slice('--max-records='.length)
const fileFilterArg = args.find((arg) => arg.startsWith('--file='))?.slice('--file='.length)
const maxRecords = Number.isFinite(Number(maxRecordsArg)) ? Number(maxRecordsArg) : Infinity

const fileFilterSet = fileFilterArg
  ? new Set(
      fileFilterArg
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => (entry.endsWith('.js') ? entry : `${entry}.js`))
    )
  : null

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const pad2 = (value) => String(value).padStart(2, '0')
const getCurrentIstDatePrefix = () => {
  const istDate = new Date(Date.now() + IST_OFFSET_MS)
  const year = istDate.getUTCFullYear()
  const month = pad2(istDate.getUTCMonth() + 1)
  const day = pad2(istDate.getUTCDate())
  return `${year}-${month}-${day}`
}

const datePrefix = explicitDate || getCurrentIstDatePrefix()

const rootDir = process.cwd()
const templeDir = path.resolve(rootDir, 'src/data/temples')

const DEFAULT_SVG_RE = /^\/temples\/temple-0[1-6]\.svg$/i
const COMMONS_IMAGE_RE = /^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//i
const BAD_FILE_HINTS = new Set([
  'logo',
  'map',
  'icon',
  'flag',
  'symbol',
  'diagram',
  'location',
  'route',
  'poster',
  'stamp',
  'coin',
  'inscription',
  'seal',
  'emblem',
])

const STOPWORDS = new Set([
  'temple',
  'mandir',
  'mahadev',
  'shiva',
  'shiv',
  'swamy',
  'swami',
  'sri',
  'shri',
  'shree',
  'baba',
  'lord',
  'ji',
  'dham',
  'devaloi',
  'sannidhi',
  'jyotirlinga',
  'kovil',
  'historic',
  'ancient',
  'prachin',
  'old',
  'bhagwan',
  'node',
])

const LOCATION_STOPWORDS = new Set([
  'india',
  'pradesh',
  'madhya',
  'uttar',
  'tamil',
  'nadu',
  'andhra',
  'chhattisgarh',
  'chattisgarh',
  'maharashtra',
  'karnataka',
  'gujarat',
  'odisha',
  'jharkhand',
  'assam',
  'jammu',
  'kashmir',
  'district',
  'city',
  'village',
  'sector',
  'colony',
  'near',
  'ghat',
])

const templeFiles = fs
  .readdirSync(templeDir)
  .filter((file) => file.endsWith('.js') && file !== 'index.js' && !file.includes('-shakti'))
  .filter((file) => (fileFilterSet ? fileFilterSet.has(file) : true))
  .sort()

const normalizeTokens = (value) =>
  normalizeText(String(value ?? ''))
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)

const unique = (values) => [...new Set(values.filter(Boolean))]

const cleanTempleName = (name) =>
  String(name ?? '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+-\s+.*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toNameTokens = (name) =>
  normalizeTokens(cleanTempleName(name)).filter(
    (token) => token.length >= 3 && !STOPWORDS.has(token)
  )

const toLocationTokens = (temple) => {
  const regionChunk = String(temple?.region ?? '').split(',').slice(0, 2).join(' ')
  const raw = `${temple?.city ?? ''} ${temple?.district ?? ''} ${regionChunk} ${temple?.state ?? ''}`
  return normalizeTokens(raw).filter(
    (token) => token.length >= 3 && !LOCATION_STOPWORDS.has(token) && !STOPWORDS.has(token)
  )
}

const buildPrimaryPhrase = (name) => {
  const parts = normalizeTokens(cleanTempleName(name)).filter((token) => !STOPWORDS.has(token))
  return parts.slice(0, 5).join(' ')
}

const isDefaultTempleSvg = (imageUrl) => DEFAULT_SVG_RE.test(String(imageUrl || '').trim())
const isCommonsImage = (imageUrl) => COMMONS_IMAGE_RE.test(String(imageUrl || '').trim())

const fetchJson = async (url) => {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'SanatanDharmaDigitalAtlas/1.0 (Wikimedia matcher)',
    },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  return res.json()
}

const buildCommonsSearchUrl = (query) => {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrnamespace', '6')
  url.searchParams.set('gsrsearch', query)
  url.searchParams.set('gsrlimit', '10')
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|mime|extmetadata')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  return url.toString()
}

const getCommonsCandidates = async (query) => {
  const payload = await fetchJson(buildCommonsSearchUrl(query))
  const pages = Object.values(payload?.query?.pages || {})
  return pages
    .map((page) => {
      const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null
      if (!info) return null
      return {
        title: String(page.title || '').trim(),
        descriptionurl: String(info.descriptionurl || '').trim(),
        url: String(info.url || '').trim(),
        mime: String(info.mime || '').trim(),
      }
    })
    .filter(Boolean)
}

const scoreCandidate = (candidate, context) => {
  const fileTitle = candidate.title.replace(/^File:/i, '')
  if (!fileTitle) return null
  if (/\.svg$/i.test(fileTitle)) return null
  if (!candidate.mime.startsWith('image/')) return null

  const titleText = normalizeText(fileTitle.replace(/\.[a-z0-9]+$/i, ' '))
  const titleTokens = new Set(normalizeTokens(titleText))

  let badHits = 0
  for (const bad of BAD_FILE_HINTS) {
    if (titleTokens.has(bad)) badHits += 1
  }
  if (badHits >= 2) return null

  let matchedName = 0
  for (const token of context.nameTokens) {
    if (titleTokens.has(token)) matchedName += 1
  }

  let matchedLocation = 0
  for (const token of context.locationTokens) {
    if (titleTokens.has(token)) matchedLocation += 1
  }

  const phraseBonus =
    context.primaryPhrase && context.primaryPhrase.split(' ').length >= 2
      ? titleText.includes(context.primaryPhrase)
        ? 4
        : 0
      : 0

  const minNameMatches = context.nameTokens.length >= 4 ? 2 : 1
  if (matchedName < minNameMatches && phraseBonus === 0) return null

  const score = matchedName * 4 + matchedLocation * 2 + phraseBonus - badHits * 2
  if (score < 8) return null

  return {
    score,
    matchedName,
    matchedLocation,
    fileTitle,
  }
}

const buildQueries = (temple) => {
  const name = cleanTempleName(temple?.name)
  const city = String(temple?.city || '').trim()
  const district = String(temple?.district || '').trim()
  const state = String(temple?.state || '').trim()
  const location = district || city
  return unique([
    `${name} ${location} ${state} temple`.trim(),
    `${name} ${location}`.trim(),
    `${name} ${state}`.trim(),
    `${name} temple`.trim(),
  ])
}

const findBestCommonsImage = async (temple) => {
  const context = {
    nameTokens: toNameTokens(temple?.name),
    locationTokens: toLocationTokens(temple),
    primaryPhrase: buildPrimaryPhrase(temple?.name),
  }
  if (!context.nameTokens.length) return null

  let best = null
  const queries = buildQueries(temple)
  for (const query of queries) {
    let candidates = []
    try {
      candidates = await getCommonsCandidates(query)
    } catch {
      continue
    }

    for (const candidate of candidates) {
      const scored = scoreCandidate(candidate, context)
      if (!scored) continue
      const row = {
        ...candidate,
        ...scored,
        query,
      }
      if (!best || row.score > best.score) {
        best = row
      }
    }

    if (best && best.score >= 12) {
      break
    }
  }

  return best
}

const loadTempleArray = async (absolutePath) => {
  const moduleUrl = `${pathToFileURL(absolutePath).href}?t=${Date.now()}-${Math.random()}`
  const moduleData = await import(moduleUrl)
  const exportEntry = Object.entries(moduleData).find(([, value]) => Array.isArray(value))
  if (!exportEntry) {
    throw new Error(`Could not find exported temple array in ${absolutePath}`)
  }
  return {
    exportName: exportEntry[0],
    records: exportEntry[1],
  }
}

const toCommonsImageUrl = (fileTitle) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileTitle)}`

const toCommonsCreditUrl = (fullTitle, descriptionUrl) =>
  descriptionUrl || `https://commons.wikimedia.org/wiki/${String(fullTitle || '').replace(/\s+/g, '_')}`

const summary = {
  datePrefix,
  dryRun,
  includeAllToday,
  fileFilter: fileFilterSet ? [...fileFilterSet] : null,
  scannedFiles: 0,
  scannedTodayRecords: 0,
  lookupCandidates: 0,
  matched: 0,
  unresolved: 0,
  skippedExistingCommons: 0,
  changedFiles: 0,
}

const unresolvedRows = []
const matchedRows = []

for (const file of templeFiles) {
  const absolutePath = path.join(templeDir, file)
  const { exportName, records } = await loadTempleArray(absolutePath)
  summary.scannedFiles += 1

  let fileChanged = false
  let fileMatched = 0
  let fileUnresolved = 0
  let fileLookups = 0

  for (let index = 0; index < records.length; index += 1) {
    const temple = records[index]
    if (!String(temple?.addedAt || '').startsWith(datePrefix)) {
      continue
    }

    summary.scannedTodayRecords += 1

    if (isCommonsImage(temple?.image)) {
      summary.skippedExistingCommons += 1
      continue
    }

    const shouldLookup = includeAllToday || !temple?.image || isDefaultTempleSvg(temple?.image)
    if (!shouldLookup) {
      continue
    }

    if (summary.lookupCandidates >= maxRecords) {
      continue
    }

    summary.lookupCandidates += 1
    fileLookups += 1

    const best = await findBestCommonsImage(temple)
    if (!best) {
      summary.unresolved += 1
      fileUnresolved += 1
      unresolvedRows.push({
        file,
        name: temple?.name || '',
        city: temple?.city || '',
        district: temple?.district || '',
        state: temple?.state || '',
      })
      continue
    }

    const updated = {
      ...temple,
      image: toCommonsImageUrl(best.fileTitle),
      credit: 'Wikimedia Commons',
      creditUrl: toCommonsCreditUrl(best.title, best.descriptionurl),
    }

    if (!dryRun) {
      records[index] = updated
      fileChanged = true
    }

    summary.matched += 1
    fileMatched += 1
    matchedRows.push({
      file,
      name: temple?.name || '',
      city: temple?.city || '',
      district: temple?.district || '',
      state: temple?.state || '',
      fileTitle: best.fileTitle,
      score: best.score,
      query: best.query,
    })
  }

  if (fileChanged) {
    const output = `export const ${exportName} = ${JSON.stringify(records, null, 2)};\n`
    fs.writeFileSync(absolutePath, output, 'utf8')
    summary.changedFiles += 1
  }

  if (fileLookups > 0 || fileMatched > 0 || fileUnresolved > 0) {
    console.log(
      `${file}: lookedUp=${fileLookups}, matched=${fileMatched}, unresolved=${fileUnresolved}${fileChanged ? ', updated=yes' : ''}`
    )
  }
}

console.log('\nWikimedia fetch summary:')
console.log(`- Date prefix: ${summary.datePrefix}`)
console.log(`- Dry run: ${summary.dryRun}`)
console.log(`- Include all today: ${summary.includeAllToday}`)
if (summary.fileFilter) {
  console.log(`- File filter: ${summary.fileFilter.join(', ')}`)
}
console.log(`- Files scanned: ${summary.scannedFiles}`)
console.log(`- Today records scanned: ${summary.scannedTodayRecords}`)
console.log(`- Lookup candidates: ${summary.lookupCandidates}`)
console.log(`- Matched: ${summary.matched}`)
console.log(`- Unresolved: ${summary.unresolved}`)
console.log(`- Already using Wikimedia Commons: ${summary.skippedExistingCommons}`)
console.log(`- Files changed: ${summary.changedFiles}`)

if (unresolvedRows.length) {
  console.log('\nUnresolved examples (up to 40):')
  unresolvedRows.slice(0, 40).forEach((row) => {
    const locality = [row.city, row.district].filter(Boolean).join(', ')
    console.log(`- ${row.name} (${locality || 'Unknown locality'}, ${row.state || 'Unknown state'}) [${row.file}]`)
  })
}

if (matchedRows.length) {
  console.log('\nMatched records:')
  matchedRows.forEach((row) => {
    const locality = [row.city, row.district].filter(Boolean).join(', ')
    console.log(
      `- ${row.name} (${locality || 'Unknown locality'}, ${row.state || 'Unknown state'}) -> ${row.fileTitle} [score=${row.score}] [${row.file}]`
    )
  })
}
