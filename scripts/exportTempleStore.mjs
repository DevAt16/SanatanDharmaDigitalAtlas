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

const records = []

for (const { item, mode } of allRawRecords) {
  const canonical = toCanonicalTemple(item, mode, defaults)
  records.push(canonical)
}

records.sort(compareTempleRecords)
ensureDir(STORE_DIR)
writeNdjson(STORE_FILE, records)

const metadata = buildStoreMetadata(records, { source: sourceUrl })
writeJson(STORE_META_FILE, metadata)

console.log(`Store exported: ${STORE_FILE}`)
console.log(`Metadata: ${STORE_META_FILE}`)
console.log(`Stored records: ${records.length}`)
