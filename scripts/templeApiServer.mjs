import http from 'http'
import fs from 'fs'
import { URL } from 'url'
import { readNdjson, STORE_FILE, STORE_META_FILE } from './templeStoreUtils.mjs'

const argMap = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, value] = arg.slice(2).split('=')
      return [key, value ?? 'true']
    })
)

const host = argMap.get('host') || process.env.TEMPLE_API_HOST || '127.0.0.1'
const port = Number(argMap.get('port') || process.env.TEMPLE_API_PORT || 8787)
const maxLimit = Number(argMap.get('maxLimit') || process.env.TEMPLE_API_MAX_LIMIT || 500)

if (!Number.isFinite(port) || port <= 0) {
  console.error('Invalid port. Use --port=<number>')
  process.exit(1)
}
if (!Number.isFinite(maxLimit) || maxLimit <= 0) {
  console.error('Invalid maxLimit. Use --maxLimit=<number>')
  process.exit(1)
}

const records = readNdjson(STORE_FILE)
let metadata = {}
try {
  metadata = JSON.parse(fs.readFileSync(STORE_META_FILE, 'utf8'))
} catch {
  metadata = {}
}

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const toSearchBlob = (item) =>
  [
    item.name,
    item.state,
    item.city,
    item.region,
    item.deity,
    item.tradition,
    item.story,
    item.highlight,
    ...(item.tags || []),
    ...(item.rituals || []),
    ...(item.festivals || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const parseNumber = (value, fallback) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const toJson = (res, statusCode, value) => {
  const body = JSON.stringify(value)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  })
  res.end(body)
}

const readQueryFilters = (url) => ({
  mode: normalizeText(url.searchParams.get('mode')),
  state: normalizeText(url.searchParams.get('state')),
  city: normalizeText(url.searchParams.get('city')),
  search: normalizeText(url.searchParams.get('search')),
  deity: normalizeText(url.searchParams.get('deity')),
  tradition: normalizeText(url.searchParams.get('tradition')),
  tag: normalizeText(url.searchParams.get('tag')),
  hasImage: normalizeText(url.searchParams.get('hasImage')),
})

const applyFilters = (pool, filters) =>
  pool.filter((item) => {
    if (filters.mode && normalizeText(item.mode) !== filters.mode) return false
    if (filters.state && normalizeText(item.state) !== filters.state) return false
    if (filters.city && normalizeText(item.city) !== filters.city) return false
    if (filters.deity && normalizeText(item.deity) !== filters.deity) return false
    if (filters.tradition && normalizeText(item.tradition) !== filters.tradition) return false

    if (filters.tag) {
      const tags = Array.isArray(item.tags) ? item.tags : []
      const matchedTag = tags.some((tag) => normalizeText(tag) === filters.tag)
      if (!matchedTag) return false
    }

    if (filters.hasImage === 'true' && (!item.image || item.image === 'Not Available')) {
      return false
    }
    if (filters.hasImage === 'false' && item.image && item.image !== 'Not Available') {
      return false
    }

    if (filters.search) {
      return toSearchBlob(item).includes(filters.search)
    }

    return true
  })

const sortRecords = (items, sortValue) => {
  const sort = normalizeText(sortValue)
  const copy = [...items]

  if (sort === 'name_desc') {
    copy.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')))
    return copy
  }
  if (sort === 'addedat_asc') {
    copy.sort((a, b) => Date.parse(a.addedAt || '') - Date.parse(b.addedAt || ''))
    return copy
  }
  if (sort === 'addedat_desc') {
    copy.sort((a, b) => Date.parse(b.addedAt || '') - Date.parse(a.addedAt || ''))
    return copy
  }

  copy.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
  return copy
}

const collectStates = (pool) =>
  [...new Set(pool.map((item) => item.state).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )

const collectCities = (pool) =>
  [...new Set(pool.map((item) => item.city).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method !== 'GET') {
    toJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (url.pathname === '/health') {
    toJson(res, 200, {
      ok: true,
      total: records.length,
      storeFile: STORE_FILE,
    })
    return
  }

  if (url.pathname === '/api/facets') {
    const filters = readQueryFilters(url)
    const filtered = applyFilters(records, { ...filters, city: '', search: '' })
    toJson(res, 200, {
      states: collectStates(filtered),
      cities: collectCities(
        filters.state
          ? filtered.filter((item) => normalizeText(item.state) === filters.state)
          : filtered
      ),
      total: filtered.length,
    })
    return
  }

  if (url.pathname === '/api/stats') {
    const filters = readQueryFilters(url)
    const filtered = applyFilters(records, filters)
    const states = new Set(filtered.map((item) => item.state))
    const cities = new Set(filtered.map((item) => item.city))
    toJson(res, 200, {
      total: filtered.length,
      states: states.size,
      cities: cities.size,
      generatedAt: metadata?.generatedAt || null,
    })
    return
  }

  if (url.pathname === '/api/temples') {
    const filters = readQueryFilters(url)
    const limit = Math.max(
      1,
      Math.min(maxLimit, parseNumber(url.searchParams.get('limit'), 25))
    )
    const offset = Math.max(0, parseNumber(url.searchParams.get('offset'), 0))
    const sort = url.searchParams.get('sort') || 'name_asc'

    const filtered = sortRecords(applyFilters(records, filters), sort)
    const items = filtered.slice(offset, offset + limit)

    toJson(res, 200, {
      items,
      total: filtered.length,
      limit,
      offset,
      hasMore: offset + limit < filtered.length,
      generatedAt: metadata?.generatedAt || null,
    })
    return
  }

  toJson(res, 404, { error: 'Not found' })
})

server.listen(port, host, () => {
  console.log(`Temple API running at http://${host}:${port}`)
  console.log(`Loaded records: ${records.length}`)
  console.log(`Max limit: ${maxLimit}`)
})
