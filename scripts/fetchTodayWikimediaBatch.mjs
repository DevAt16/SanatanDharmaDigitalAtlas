import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)

const argValue = (key, fallback = '') =>
  args.find((arg) => arg.startsWith(`${key}=`))?.slice(key.length + 1) ?? fallback

const datePrefix = argValue('--date', '2026-02-27')
const start = Number(argValue('--start', '0')) || 0
const take = Number(argValue('--take', '80')) || 80
const delayMs = Number(argValue('--delay-ms', '900')) || 900

const filesArg = argValue('--files', 'maharashtra.js,uttarPradesh.js')
const files = filesArg
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => (s.endsWith('.js') ? s : `${s}.js`))

const rootDir = process.cwd()
const templeDir = path.resolve(rootDir, 'src/data/temples')

const isPlaceholder = (imageUrl) => /^\/temples\/temple-0[1-6]\.svg$/i.test(String(imageUrl || '').trim())
const isCommons = (imageUrl) =>
  /^https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//i.test(String(imageUrl || '').trim())

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const normalizeTokens = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)

const badHints = new Set(['logo', 'map', 'icon', 'flag', 'seal', 'symbol', 'emblem'])
const templeHints = new Set(['temple', 'mandir', 'mahadev', 'shiva', 'shiv', 'eshwar', 'nath'])

const buildCommonsSearchUrl = (query, limit = 6) => {
  const url = new URL('https://commons.wikimedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrnamespace', '6')
  url.searchParams.set('gsrsearch', query)
  url.searchParams.set('gsrlimit', String(limit))
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|mime')
  return url.toString()
}

const fetchCommonsCandidates = async (query, limit = 6, retry = 3) => {
  const url = buildCommonsSearchUrl(query, limit)
  for (let attempt = 0; attempt <= retry; attempt += 1) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SanatanDharmaDigitalAtlas/1.0 (batch Wikimedia image fetch)',
      },
    })

    if (res.status === 429) {
      const waitMs = (attempt + 1) * 2500
      await sleep(waitMs)
      continue
    }
    if (!res.ok) {
      return []
    }

    const json = await res.json()
    const pages = Object.values(json?.query?.pages || {})
    return pages
      .map((page) => {
        const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null
        if (!info) return null
        return {
          title: String(page.title || '').trim(),
          mime: String(info.mime || '').trim(),
        }
      })
      .filter(Boolean)
  }
  return []
}

const scoreCandidate = (candidate, temple) => {
  if (!candidate?.title) return -999
  if (!String(candidate.mime || '').startsWith('image/')) return -999
  const fileTitle = candidate.title.replace(/^File:/i, '')
  if (!fileTitle || /\.svg$/i.test(fileTitle)) return -999

  const titleLower = fileTitle.toLowerCase()
  for (const hint of badHints) {
    if (titleLower.includes(hint)) return -999
  }

  const nameTokens = normalizeTokens(String(temple?.name || '').replace(/\([^)]*\)/g, ' ')).filter(
    (token) => token.length >= 4
  )
  const cityTokens = normalizeTokens(temple?.city || '').filter((token) => token.length >= 4)

  let score = 0
  for (const hint of templeHints) {
    if (titleLower.includes(hint)) score += 2
  }
  for (const token of nameTokens) {
    if (titleLower.includes(token)) score += 2
  }
  for (const token of cityTokens) {
    if (titleLower.includes(token)) score += 1
  }
  return score
}

const filePathUrlFromTitle = (title) => {
  const fileName = String(title || '').replace(/^File:/i, '').replace(/ /g, '_')
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
}

const filePageUrlFromTitle = (title) =>
  `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(title || '').replace(/ /g, '_'))}`

const cleanName = (name) =>
  String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const loadDataset = (file) => {
  const fullPath = path.join(templeDir, file)
  let text = fs.readFileSync(fullPath, 'utf8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const exportMatch = text.match(/^export const\s+(\w+)\s*=\s*/)
  if (!exportMatch) {
    throw new Error(`Could not parse export name in ${file}`)
  }
  const exportName = exportMatch[1]
  const payload = text.replace(/^export const\s+\w+\s*=\s*/, '').replace(/;\s*$/, '')
  const records = JSON.parse(payload)
  return { file, fullPath, exportName, records }
}

const saveDataset = (dataset) => {
  const out = `export const ${dataset.exportName} = ${JSON.stringify(dataset.records, null, 2)};\n`
  fs.writeFileSync(dataset.fullPath, out, 'utf8')
}

const datasets = files.map(loadDataset)

const todayRecords = []
for (const ds of datasets) {
  ds.records.forEach((temple, index) => {
    if (String(temple?.addedAt || '').startsWith(datePrefix)) {
      todayRecords.push({ file: ds.file, index, temple })
    }
  })
}

const selected = todayRecords.slice(start, start + take)

let matched = 0
let unresolved = 0
let skippedCommons = 0
let skippedCustomImage = 0

for (let i = 0; i < selected.length; i += 1) {
  const row = selected[i]
  const temple = row.temple

  if (isCommons(temple?.image)) {
    skippedCommons += 1
    continue
  }
  if (!isPlaceholder(temple?.image) && String(temple?.image || '').trim()) {
    skippedCustomImage += 1
    continue
  }

  const baseName = cleanName(temple?.name)
  const q1 = `${temple?.name || ''} ${temple?.city || ''} ${temple?.state || ''} temple`
    .replace(/\s+/g, ' ')
    .trim()
  const q2 = `${baseName} ${temple?.city || temple?.district || ''} ${temple?.state || ''} temple`
    .replace(/\s+/g, ' ')
    .trim()
  const q3 = `${baseName} ${temple?.state || ''} temple`
    .replace(/\s+/g, ' ')
    .trim()
  const queries = [q1, q2, q3].filter(Boolean)

  let best = null
  let bestScore = -999
  for (const query of queries) {
    await sleep(delayMs)
    const candidates = await fetchCommonsCandidates(query, 6, 2)
    for (const candidate of candidates) {
      const score = scoreCandidate(candidate, temple)
      if (score > bestScore) {
        best = candidate
        bestScore = score
      }
    }
    if (bestScore >= 7) break
  }

  if (best && bestScore >= 4) {
    const ds = datasets.find((entry) => entry.file === row.file)
    const rec = ds.records[row.index]
    rec.image = filePathUrlFromTitle(best.title)
    rec.credit = 'Wikimedia Commons'
    rec.creditUrl = filePageUrlFromTitle(best.title)
    matched += 1
  } else {
    unresolved += 1
  }
}

for (const ds of datasets) {
  saveDataset(ds)
}

console.log('Batch complete:')
console.log(`- Date prefix: ${datePrefix}`)
console.log(`- Files: ${files.join(', ')}`)
console.log(`- Total today records in scope: ${todayRecords.length}`)
console.log(`- Batch range: start=${start}, take=${take}, processed=${selected.length}`)
console.log(`- Matched in batch: ${matched}`)
console.log(`- Unresolved in batch: ${unresolved}`)
console.log(`- Skipped existing Commons: ${skippedCommons}`)
console.log(`- Skipped non-placeholder images: ${skippedCustomImage}`)
console.log(`- Next start: ${start + take}`)
