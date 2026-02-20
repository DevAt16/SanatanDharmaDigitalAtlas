import path from 'path'
import {
  STORE_DIR,
  STORE_FILE,
  STORE_META_FILE,
  ensureDir,
  readNdjson,
  writeNdjson,
  writeJson,
  readInputTempleArray,
  toCanonicalTemple,
  buildStrictKey,
  buildLooseKey,
  compareTempleRecords,
  buildStoreMetadata,
  normalizeText,
} from './templeStoreUtils.mjs'

const printUsageAndExit = () => {
  console.error(
    'Usage: node scripts/ingestTempleStore.mjs <input-json> [--mode=shiva|shakti] [--state=<state>] [--sourceType=<type>] [--sourceUrl=<url>] [--dry-run]'
  )
  process.exit(1)
}

const args = process.argv.slice(2)
if (!args.length) printUsageAndExit()

const inputJsonPathArg = args.find((arg) => !arg.startsWith('--'))
if (!inputJsonPathArg) printUsageAndExit()

const argMap = new Map(
  args
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, value] = arg.slice(2).split('=')
      return [key, value ?? 'true']
    })
)

const modeArg = normalizeText(argMap.get('mode'))
if (modeArg && modeArg !== 'shiva' && modeArg !== 'shakti') {
  console.error('Invalid --mode value. Use shiva or shakti.')
  process.exit(1)
}

const defaultState = argMap.get('state')
const sourceType = argMap.get('sourceType') || 'manual_ingest'
const sourceUrl = argMap.get('sourceUrl') || inputJsonPathArg
const dryRun = argMap.get('dry-run') === 'true'

const inputPath = path.resolve(process.cwd(), inputJsonPathArg)
const incoming = readInputTempleArray(inputPath)

ensureDir(STORE_DIR)
const existing = readNdjson(STORE_FILE)
const strictSeen = new Set(existing.map((record) => buildStrictKey(record)))
const looseSeen = new Set(existing.map((record) => buildLooseKey(record)))

const accepted = []
const skipped = []

for (const rawRecord of incoming) {
  if (!rawRecord || typeof rawRecord !== 'object') {
    skipped.push({ name: 'Unknown', reason: 'invalid_record' })
    continue
  }

  const mode = normalizeText(rawRecord.mode || modeArg || 'shiva')
  if (mode !== 'shiva' && mode !== 'shakti') {
    skipped.push({
      name: rawRecord.name || 'Unknown',
      reason: 'invalid_mode',
    })
    continue
  }

  const canonical = toCanonicalTemple(rawRecord, mode, {
    state: defaultState,
    sourceType,
    sourceUrl,
    lastVerifiedAt: new Date().toISOString(),
  })

  if (canonical.name === 'Not Available') {
    skipped.push({ name: canonical.name, reason: 'missing_name' })
    continue
  }
  if (canonical.state === 'Not Available' || canonical.city === 'Not Available') {
    skipped.push({ name: canonical.name, reason: 'missing_state_or_city' })
    continue
  }

  const strictKey = buildStrictKey(canonical)
  const looseKey = buildLooseKey(canonical)
  if (strictSeen.has(strictKey) || looseSeen.has(looseKey)) {
    skipped.push({
      name: canonical.name,
      reason: strictSeen.has(strictKey) ? 'duplicate_strict' : 'duplicate_loose',
    })
    continue
  }

  strictSeen.add(strictKey)
  looseSeen.add(looseKey)
  accepted.push(canonical)
}

const nextRecords = [...existing, ...accepted].sort(compareTempleRecords)

if (!dryRun) {
  writeNdjson(STORE_FILE, nextRecords)
  const metadata = buildStoreMetadata(nextRecords, {
    source: 'manual_ingest',
    lastIngestedAt: new Date().toISOString(),
    lastIngestSource: sourceUrl,
  })
  writeJson(STORE_META_FILE, metadata)
}

console.log(`Input file: ${inputJsonPathArg}`)
console.log(`Existing store records: ${existing.length}`)
console.log(`Incoming records: ${incoming.length}`)
console.log(`Accepted records: ${accepted.length}`)
console.log(`Skipped records: ${skipped.length}`)
console.log(`Dry run: ${dryRun ? 'yes' : 'no'}`)

if (skipped.length) {
  console.log('\nSkipped details:')
  for (const item of skipped.slice(0, 50)) {
    console.log(`- ${item.name}: ${item.reason}`)
  }
  if (skipped.length > 50) {
    console.log(`... and ${skipped.length - 50} more`)
  }
}
