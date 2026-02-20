import {
  templeData,
  shaktiTempleData,
} from '../src/data/temples/index.js'
import {
  STORE_DIR,
  STORE_FILE,
  STORE_META_FILE,
  ensureDir,
  writeNdjson,
  writeJson,
  toCanonicalTemple,
  buildStrictKey,
  buildLooseKey,
  compareTempleRecords,
  buildStoreMetadata,
} from './templeStoreUtils.mjs'

const sourceUrl = 'src/data/temples/index.js'
const defaults = {
  sourceType: 'seed',
  sourceUrl,
  confidenceScore: 1,
  lastVerifiedAt: new Date().toISOString(),
}

const allRawRecords = [
  ...templeData.map((item) => ({ item, mode: 'shiva' })),
  ...shaktiTempleData.map((item) => ({ item, mode: 'shakti' })),
]

const strictSeen = new Set()
const looseSeen = new Set()
const records = []
const skipped = []

for (const { item, mode } of allRawRecords) {
  const canonical = toCanonicalTemple(item, mode, defaults)
  const strictKey = buildStrictKey(canonical)
  const looseKey = buildLooseKey(canonical)

  if (strictSeen.has(strictKey) || looseSeen.has(looseKey)) {
    skipped.push({
      name: canonical.name,
      state: canonical.state,
      city: canonical.city,
      mode,
      reason: strictSeen.has(strictKey) ? 'duplicate_strict' : 'duplicate_loose',
    })
    continue
  }

  strictSeen.add(strictKey)
  looseSeen.add(looseKey)
  records.push(canonical)
}

records.sort(compareTempleRecords)
ensureDir(STORE_DIR)
writeNdjson(STORE_FILE, records)

const metadata = buildStoreMetadata(records, {
  source: sourceUrl,
  skipped: skipped.length,
})
writeJson(STORE_META_FILE, metadata)

console.log(`Store exported: ${STORE_FILE}`)
console.log(`Metadata: ${STORE_META_FILE}`)
console.log(`Input records: ${allRawRecords.length}`)
console.log(`Stored records: ${records.length}`)
console.log(`Skipped duplicates: ${skipped.length}`)
