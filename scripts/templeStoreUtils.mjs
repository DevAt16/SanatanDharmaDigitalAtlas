import fs from 'fs'
import path from 'path'

const DEFAULT_TEXT = 'Not Available'

const toStringValue = (value) => {
  if (value === null || value === undefined) return DEFAULT_TEXT
  const text = String(value).trim()
  return text || DEFAULT_TEXT
}

export const toArrayValue = (value) => {
  if (!Array.isArray(value) || value.length === 0) return [DEFAULT_TEXT]
  const normalized = value.map((item) => toStringValue(item))
  return normalized.length ? normalized : [DEFAULT_TEXT]
}

export const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

export const slugify = (value) =>
  normalizeText(value)
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '') || 'na'

const normalizeLooseName = (value) =>
  normalizeText(String(value ?? '').replace(/\([^)]*\)/g, ' '))
    .replace(/\b(temple|mandir|mahadev|shiva|shiv|nath|swamy|swami|sree|sri)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const buildStrictKey = (record) =>
  [
    normalizeText(record?.mode),
    normalizeText(record?.name),
    normalizeText(record?.state),
    normalizeText(record?.city),
  ].join('|')

export const buildLooseKey = (record) =>
  [
    normalizeText(record?.mode),
    normalizeLooseName(record?.name),
    normalizeText(record?.state),
    normalizeText(record?.city),
  ].join('|')

export const toCanonicalTemple = (record, mode, defaults = {}) => {
  const state = toStringValue(record?.state ?? defaults.state)
  const city = toStringValue(record?.city ?? defaults.city)
  const name = toStringValue(record?.name)
  const region = toStringValue(record?.region)

  return {
    id: `${mode}-${slugify(state)}-${slugify(city)}-${slugify(name)}`,
    mode,
    name,
    state,
    city,
    region,
    deity: toStringValue(record?.deity),
    tradition: toStringValue(record?.tradition),
    tags: toArrayValue(record?.tags),
    story: toStringValue(record?.story),
    highlight: toStringValue(record?.highlight),
    image: toStringValue(record?.image),
    credit: toStringValue(record?.credit),
    creditUrl: toStringValue(record?.creditUrl),
    bestTime: toStringValue(record?.bestTime),
    timings: toStringValue(record?.timings),
    dressCode: toStringValue(record?.dressCode),
    entryNotes: toStringValue(record?.entryNotes),
    rituals: toArrayValue(record?.rituals),
    festivals: toArrayValue(record?.festivals),
    moreDetails:
      record?.moreDetails && typeof record.moreDetails === 'object'
        ? record.moreDetails
        : {},
    addedAt: toStringValue(record?.addedAt),
    sourceType: toStringValue(record?.sourceType ?? defaults.sourceType ?? 'Not Available'),
    sourceUrl: toStringValue(record?.sourceUrl ?? defaults.sourceUrl),
    confidenceScore:
      Number.isFinite(Number(record?.confidenceScore))
        ? Number(record.confidenceScore)
        : Number.isFinite(Number(defaults.confidenceScore))
          ? Number(defaults.confidenceScore)
          : 0.5,
    lastVerifiedAt: toStringValue(record?.lastVerifiedAt ?? defaults.lastVerifiedAt),
  }
}

export const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true })
}

export const readNdjson = (filePath) => {
  if (!fs.existsSync(filePath)) return []
  const lines = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line, index) => {
    try {
      return JSON.parse(line)
    } catch (error) {
      throw new Error(`Invalid NDJSON at line ${index + 1}: ${error.message}`)
    }
  })
}

export const writeNdjson = (filePath, records) => {
  const content = records.map((item) => JSON.stringify(item)).join('\n')
  fs.writeFileSync(filePath, `${content}\n`, 'utf8')
}

export const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export const STORE_DIR = path.resolve(process.cwd(), 'data-store')
export const STORE_FILE = path.join(STORE_DIR, 'temples.ndjson')
export const STORE_META_FILE = path.join(STORE_DIR, 'metadata.json')

export const readInputTempleArray = (inputPath) => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const raw = fs.readFileSync(inputPath, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`Invalid JSON in ${inputPath}: ${error.message}`)
  }

  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.temples)
      ? parsed.temples
      : Array.isArray(parsed?.results)
        ? parsed.results
        : null

  if (!Array.isArray(items)) {
    throw new Error(
      `Expected array JSON or object with "temples"/"results" array in ${inputPath}`
    )
  }

  return items
}

export const compareTempleRecords = (a, b) => {
  const stateDiff = a.state.localeCompare(b.state)
  if (stateDiff !== 0) return stateDiff
  const cityDiff = a.city.localeCompare(b.city)
  if (cityDiff !== 0) return cityDiff
  return a.name.localeCompare(b.name)
}

export const buildStoreMetadata = (records, extra = {}) => {
  const countsByMode = {}
  const countsByState = {}
  const countsByModeState = {}

  for (const record of records) {
    const mode = record.mode || 'unknown'
    const state = record.state || DEFAULT_TEXT
    countsByMode[mode] = (countsByMode[mode] || 0) + 1
    countsByState[state] = (countsByState[state] || 0) + 1
    const modeStateKey = `${mode}:${state}`
    countsByModeState[modeStateKey] = (countsByModeState[modeStateKey] || 0) + 1
  }

  return {
    generatedAt: new Date().toISOString(),
    total: records.length,
    countsByMode,
    countsByState,
    countsByModeState,
    ...extra,
  }
}
