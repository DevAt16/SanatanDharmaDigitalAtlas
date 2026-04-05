/**
 * exportMySqlSeed.mjs
 *
 * Reads data-store/temples.ndjson and generates database/seed-data.sql
 * using the v3 schema defined in database/schema.sql.
 *
 * Usage:
 *   node scripts/exportMySqlSeed.mjs
 *   node scripts/exportMySqlSeed.mjs --input=data-store/temples.ndjson --output=database/seed-data.sql
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  createSeedExportStats,
  fitNullableVarchar,
  fitVarchar,
  formatSeedExportAdjustments,
  logSeedExportAdjustments,
  uniquifySlug,
} from './mysqlSeedExportUtils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const argMap = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=')
      return [k, v ?? 'true']
    })
)

const inputPath = path.resolve(ROOT, argMap.get('input') || 'data-store/temples.ndjson')
const outputPath = path.resolve(ROOT, argMap.get('output') || 'database/seed-data.sql')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a string value for MySQL single-quoted string literals. */
const escSql = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/** Render a nullable string column. */
const sqlStr = (value) => {
  if (value === null || value === undefined || value === '' || value === 'Not Available') {
    return 'NULL'
  }
  return escSql(value)
}

/** Render a nullable JSON column (arrays or objects). */
const sqlJson = (value) => {
  if (value === null || value === undefined) return 'NULL'
  if (Array.isArray(value) && value.length === 0) return 'NULL'
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
    return 'NULL'
  }
  return escSql(JSON.stringify(value))
}

/** Convert a timestamp string to MySQL DATETIME format, or NULL. */
const sqlTimestamp = (value) => {
  if (!value || value === 'Not Available') return 'NULL'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return 'NULL'
  // MySQL DATETIME: 'YYYY-MM-DD HH:MM:SS'
  const pad = (n) => String(n).padStart(2, '0')
  return escSql(
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  )
}

/** Derive confidence enum from confidence_score. */
const deriveConfidence = (score) => {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'low'
  if (n >= 0.8) return 'high'
  if (n >= 0.5) return 'medium'
  return 'low'
}

/** Derive verification_status. */
const deriveVerificationStatus = (record) => {
  const md = record.moreDetails
  const hasSources =
    Array.isArray(md?.sources) && md.sources.length > 0
  const score = Number(record.confidenceScore)
  if (Number.isFinite(score) && score >= 0.9 && hasSources) return 'verified'
  if (hasSources) return 'sourced'
  return 'candidate'
}

// ---------------------------------------------------------------------------
// Read NDJSON
// ---------------------------------------------------------------------------
if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`)
  process.exit(1)
}

const rawLines = fs
  .readFileSync(inputPath, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)

const records = []
for (let i = 0; i < rawLines.length; i++) {
  try {
    records.push(JSON.parse(rawLines[i]))
  } catch (err) {
    console.warn(`Skipping invalid JSON at line ${i + 1}: ${err.message}`)
  }
}

console.log(`Read ${records.length} records from ${inputPath}`)

// ---------------------------------------------------------------------------
// Deduplicate (mode + state + city + name)
// ---------------------------------------------------------------------------
const seen = new Set()
const deduped = []
let skipped = 0

for (const rec of records) {
  const key = [
    String(rec.mode ?? '').toLowerCase(),
    String(rec.state ?? '').toLowerCase().trim(),
    String(rec.city ?? '').toLowerCase().trim(),
    String(rec.name ?? '').toLowerCase().trim(),
  ].join('|')

  if (seen.has(key)) {
    skipped++
    continue
  }
  seen.add(key)
  deduped.push(rec)
}

console.log(`After deduplication: ${deduped.length} records (${skipped} skipped)`)

const exportStats = createSeedExportStats()
const usedSlugs = new Set()
const preparedRecords = deduped.map((rec) => ({
  ...rec,
  id: uniquifySlug(rec.id, usedSlugs, exportStats),
}))

// ---------------------------------------------------------------------------
// Build INSERT rows
// ---------------------------------------------------------------------------
const SCHEMA_VERSION = 3

const COL_LIST = [
  'id',
  'slug',
  'mode',
  'name',
  'name_hi',
  'state',
  'city',
  'region',
  'deity',
  'tradition',
  'story',
  'story_hi',
  'highlight',
  'highlight_hi',
  'image',
  'image_credit',
  'image_credit_url',
  'best_time',
  'timings',
  'dress_code',
  'entry_notes',
  'tags_json',
  'rituals_json',
  'festivals_json',
  'history',
  'architecture',
  'visitor_notes',
  'festivals_note',
  'darshan_info',
  'seasonal_info',
  'puranic_view',
  'folklore',
  'puranic_sources_json',
  'folklore_sources_json',
  'sources_json',
  'schema_version',
  'source_type',
  'source_title',
  'source_url',
  'verification_status',
  'confidence',
  'confidence_score',
  'added_at',
  'last_verified_at',
  'is_new',
]

const buildRow = (rec, rowId) => {
  const md = rec.moreDetails ?? {}

  // Source: prefer first entry from moreDetails.sources
  const primarySource =
    Array.isArray(md.sources) && md.sources.length > 0 ? md.sources[0] : null

  const sourceType = primarySource?.type ?? rec.sourceType ?? null
  const sourceTitle = primarySource?.label ?? null
  const sourceUrl = primarySource?.url ?? rec.sourceUrl ?? null

  const confidenceScore = Number.isFinite(Number(rec.confidenceScore))
    ? Number(rec.confidenceScore).toFixed(3)
    : '0.500'

  const values = [
    rowId,
    escSql(rec.id), // NDJSON id = slug string
    escSql(rec.mode),
    escSql(fitVarchar(rec.name, 'name', exportStats)),
    'NULL',                         // name_hi — not in NDJSON
    escSql(fitVarchar(rec.state, 'state', exportStats)),
    escSql(fitVarchar(rec.city, 'city', exportStats)),
    sqlStr(fitNullableVarchar(rec.region, 'region', exportStats)),
    sqlStr(fitVarchar(rec.deity, 'deity', exportStats)),
    sqlStr(fitNullableVarchar(rec.tradition, 'tradition', exportStats)),
    sqlStr(rec.story),
    'NULL',                         // story_hi
    sqlStr(fitNullableVarchar(rec.highlight, 'highlight', exportStats)),
    'NULL',                         // highlight_hi
    sqlStr(fitNullableVarchar(rec.image, 'image', exportStats)),
    sqlStr(fitNullableVarchar(rec.credit, 'image_credit', exportStats)), // image_credit
    sqlStr(fitNullableVarchar(rec.creditUrl, 'image_credit_url', exportStats)), // image_credit_url
    sqlStr(fitNullableVarchar(rec.bestTime, 'best_time', exportStats)), // best_time
    sqlStr(fitNullableVarchar(rec.timings, 'timings', exportStats)),
    sqlStr(fitNullableVarchar(rec.dressCode, 'dress_code', exportStats)), // dress_code
    sqlStr(rec.entryNotes),         // entry_notes
    sqlJson(rec.tags),              // tags_json
    sqlJson(rec.rituals),           // rituals_json
    sqlJson(rec.festivals),         // festivals_json
    sqlStr(md.history),             // history
    sqlStr(md.architecture),        // architecture
    sqlStr(md.visitorNotes),        // visitor_notes
    sqlStr(md.festivals),           // festivals_note
    sqlStr(md.darshan),             // darshan_info
    sqlStr(md.seasonal),            // seasonal_info
    sqlStr(md.puranicView),         // puranic_view
    sqlStr(md.folklore),            // folklore
    sqlJson(md.puranicSources),     // puranic_sources_json
    sqlJson(md.folkloreSources),    // folklore_sources_json
    sqlJson(md.sources),            // sources_json
    SCHEMA_VERSION,
    sqlStr(fitNullableVarchar(sourceType, 'source_type', exportStats)), // source_type
    sqlStr(fitNullableVarchar(sourceTitle, 'source_title', exportStats)), // source_title
    sqlStr(fitNullableVarchar(sourceUrl, 'source_url', exportStats)), // source_url
    escSql(deriveVerificationStatus(rec)), // verification_status
    escSql(deriveConfidence(rec.confidenceScore)), // confidence
    confidenceScore,
    sqlTimestamp(rec.addedAt),      // added_at
    sqlTimestamp(rec.lastVerifiedAt), // last_verified_at
    0,                              // is_new
  ]

  return `(${values.join(', ')})`
}

// ---------------------------------------------------------------------------
// Write SQL
// ---------------------------------------------------------------------------
const now = new Date().toISOString()
const renderedRows = preparedRecords.map((rec, index) => buildRow(rec, index + 1))
const adjustmentLines = formatSeedExportAdjustments(exportStats)
const header = `-- Auto-generated by scripts/exportMySqlSeed.mjs
-- Generated at: ${now}
-- Total input records: ${records.length}
-- Records exported: ${preparedRecords.length}
-- Skipped duplicates: ${skipped}${adjustmentLines.length ? `\n${adjustmentLines.join('\n')}` : ''}

USE jbn_temples;
SET NAMES utf8mb4;
SET time_zone = '+00:00';
START TRANSACTION;

-- Clean existing data (safe for re-seeding)
DELETE FROM temples;

INSERT INTO temples (${COL_LIST.join(', ')}) VALUES
`

// Build all value rows and join with commas
const BATCH_SIZE = 200
const outputLines = [header]

for (let i = 0; i < preparedRecords.length; i += BATCH_SIZE) {
  const batchRows = renderedRows.slice(i, i + BATCH_SIZE)
  outputLines.push(batchRows.join(',\n') + ';')

  if (i + BATCH_SIZE < preparedRecords.length) {
    // Start next INSERT for the next batch
    outputLines.push(`\nINSERT INTO temples (${COL_LIST.join(', ')}) VALUES\n`)
  }
}

outputLines.push('\nCOMMIT;\n')

const sqlContent = outputLines.join('\n')

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, sqlContent, 'utf8')

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1)
console.log(`Written to ${outputPath} (${sizeKb} KB)`)
logSeedExportAdjustments(exportStats)
console.log(`Done. ${preparedRecords.length} temples exported.`)
