/**
 * exportStateSeedFromJs.mjs
 *
 * Generate a state-scoped MySQL seed SQL directly from a JS data file export.
 *
 * Example:
 *   node scripts/exportStateSeedFromJs.mjs src/data/temples/uttarPradesh.js uttarPradeshTemples
 *   node scripts/exportStateSeedFromJs.mjs src/data/temples/uttarPradesh.js uttarPradeshTemples --output=database/seed-uttar-pradesh.sql
 *   node scripts/exportStateSeedFromJs.mjs src/data/temples/uttarPradesh.js uttarPradeshTemples --database=jbn_temples --mode=shiva
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import {
  createSeedExportStats,
  fitNullableVarchar,
  fitVarchar,
  formatSeedExportAdjustments,
  logSeedExportAdjustments,
  uniquifySlug,
} from './mysqlSeedExportUtils.mjs'
import { toCanonicalTemple, buildStrictKey } from './templeStoreUtils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))

if (positional.length < 2) {
  console.error(
    'Usage: node scripts/exportStateSeedFromJs.mjs <input-js-file> <export-name> [--output=...] [--database=...] [--mode=shiva|shakti] [--state=...]'
  )
  process.exit(1)
}

const [inputJsPathArg, exportName] = positional
const argMap = new Map(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=')
      return [k, v ?? 'true']
    })
)

const mode = (argMap.get('mode') || 'shiva').toLowerCase()
if (mode !== 'shiva' && mode !== 'shakti') {
  console.error('Invalid --mode. Use shiva or shakti.')
  process.exit(1)
}

const inputJsPath = path.resolve(ROOT, inputJsPathArg)
const outputPath = path.resolve(
  ROOT,
  argMap.get('output') || `database/seed-${path.basename(inputJsPath, '.js')}.sql`
)
const databaseName = argMap.get('database') || 'jbn_temples'
const forcedState = argMap.get('state')

if (!fs.existsSync(inputJsPath)) {
  console.error(`Input JS file not found: ${inputJsPath}`)
  process.exit(1)
}

const escSql = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

const sqlStr = (value) => {
  if (value === null || value === undefined || value === '' || value === 'Not Available') {
    return 'NULL'
  }
  return escSql(value)
}

const sqlJson = (value) => {
  if (value === null || value === undefined) return 'NULL'
  if (Array.isArray(value) && value.length === 0) return 'NULL'
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
    return 'NULL'
  }
  return escSql(JSON.stringify(value))
}

const sqlTimestamp = (value) => {
  if (!value || value === 'Not Available') return 'NULL'
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return 'NULL'
  const pad = (n) => String(n).padStart(2, '0')
  return escSql(
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  )
}

const deriveConfidence = (score) => {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'low'
  if (n >= 0.8) return 'high'
  if (n >= 0.5) return 'medium'
  return 'low'
}

const deriveVerificationStatus = (record) => {
  const md = record.moreDetails
  const hasSources = Array.isArray(md?.sources) && md.sources.length > 0
  const score = Number(record.confidenceScore)
  if (Number.isFinite(score) && score >= 0.9 && hasSources) return 'verified'
  if (hasSources) return 'sourced'
  return 'candidate'
}

const moduleUrl = pathToFileURL(inputJsPath).href
const imported = await import(moduleUrl)
const rawTemples = imported[exportName]

if (!Array.isArray(rawTemples)) {
  console.error(`Export "${exportName}" is not an array in ${inputJsPathArg}`)
  process.exit(1)
}

const defaults = {
  sourceType: 'seed',
  sourceUrl: inputJsPathArg,
  confidenceScore: 1,
  lastVerifiedAt: new Date().toISOString(),
}

const canonical = rawTemples.map((item) =>
  toCanonicalTemple(
    forcedState ? { ...item, state: forcedState } : item,
    mode,
    forcedState ? { ...defaults, state: forcedState } : defaults
  )
)

const seen = new Set()
const deduped = []
let skipped = 0
for (const rec of canonical) {
  const key = buildStrictKey(rec)
  if (seen.has(key)) {
    skipped++
    continue
  }
  seen.add(key)
  deduped.push(rec)
}

if (deduped.length === 0) {
  console.error('No records to export after deduplication.')
  process.exit(1)
}

const exportStats = createSeedExportStats()
const usedSlugs = new Set()
const preparedRecords = deduped.map((rec) => ({
  ...rec,
  id: uniquifySlug(rec.id, usedSlugs, exportStats),
}))

const stateSet = [...new Set(preparedRecords.map((r) => r.state).filter(Boolean))]
const stateClause = stateSet.map((s) => escSql(s)).join(', ')

const COL_LIST = [
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

const SCHEMA_VERSION = 3
const BATCH_SIZE = 200

const buildRow = (rec) => {
  const md = rec.moreDetails ?? {}
  const primarySource =
    Array.isArray(md.sources) && md.sources.length > 0 ? md.sources[0] : null
  const sourceType = primarySource?.type ?? rec.sourceType ?? null
  const sourceTitle = primarySource?.label ?? null
  const sourceUrl = primarySource?.url ?? rec.sourceUrl ?? null
  const confidenceScore = Number.isFinite(Number(rec.confidenceScore))
    ? Number(rec.confidenceScore).toFixed(3)
    : '0.500'

  const values = [
    escSql(rec.id), // slug
    escSql(rec.mode),
    escSql(fitVarchar(rec.name, 'name', exportStats)),
    'NULL',
    escSql(fitVarchar(rec.state, 'state', exportStats)),
    escSql(fitVarchar(rec.city, 'city', exportStats)),
    sqlStr(fitNullableVarchar(rec.region, 'region', exportStats)),
    sqlStr(fitVarchar(rec.deity, 'deity', exportStats)),
    sqlStr(fitNullableVarchar(rec.tradition, 'tradition', exportStats)),
    sqlStr(rec.story),
    'NULL',
    sqlStr(fitNullableVarchar(rec.highlight, 'highlight', exportStats)),
    'NULL',
    sqlStr(fitNullableVarchar(rec.image, 'image', exportStats)),
    sqlStr(fitNullableVarchar(rec.credit, 'image_credit', exportStats)),
    sqlStr(fitNullableVarchar(rec.creditUrl, 'image_credit_url', exportStats)),
    sqlStr(fitNullableVarchar(rec.bestTime, 'best_time', exportStats)),
    sqlStr(fitNullableVarchar(rec.timings, 'timings', exportStats)),
    sqlStr(fitNullableVarchar(rec.dressCode, 'dress_code', exportStats)),
    sqlStr(rec.entryNotes),
    sqlJson(rec.tags),
    sqlJson(rec.rituals),
    sqlJson(rec.festivals),
    sqlStr(md.history),
    sqlStr(md.architecture),
    sqlStr(md.visitorNotes),
    sqlStr(md.festivals),
    sqlStr(md.darshan),
    sqlStr(md.seasonal),
    sqlStr(md.puranicView),
    sqlStr(md.folklore),
    sqlJson(md.puranicSources),
    sqlJson(md.folkloreSources),
    sqlJson(md.sources),
    SCHEMA_VERSION,
    sqlStr(fitNullableVarchar(sourceType, 'source_type', exportStats)),
    sqlStr(fitNullableVarchar(sourceTitle, 'source_title', exportStats)),
    sqlStr(fitNullableVarchar(sourceUrl, 'source_url', exportStats)),
    escSql(deriveVerificationStatus(rec)),
    escSql(deriveConfidence(rec.confidenceScore)),
    confidenceScore,
    sqlTimestamp(rec.addedAt),
    sqlTimestamp(rec.lastVerifiedAt),
    0,
  ]

  return `(${values.join(', ')})`
}

const now = new Date().toISOString()
const renderedRows = preparedRecords.map((rec) => buildRow(rec))
const adjustmentLines = formatSeedExportAdjustments(exportStats)
const lines = [
  `-- Auto-generated by scripts/exportStateSeedFromJs.mjs`,
  `-- Generated at: ${now}`,
  `-- Input file: ${inputJsPathArg}`,
  `-- Export symbol: ${exportName}`,
  `-- Mode: ${mode}`,
  `-- States in export: ${stateSet.join(', ')}`,
  `-- Total input rows: ${rawTemples.length}`,
  `-- Rows exported: ${preparedRecords.length}`,
  `-- Skipped duplicates: ${skipped}`,
  ...adjustmentLines,
  '',
  `USE ${databaseName};`,
  `SET NAMES utf8mb4;`,
  `SET time_zone = '+00:00';`,
  'START TRANSACTION;',
  '',
  `-- Replace only selected state rows for this mode`,
  `DELETE FROM temples WHERE mode = ${escSql(mode)} AND state IN (${stateClause});`,
  '',
]

for (let i = 0; i < preparedRecords.length; i += BATCH_SIZE) {
  const rows = renderedRows.slice(i, i + BATCH_SIZE)
  lines.push(`INSERT INTO temples (${COL_LIST.join(', ')}) VALUES`)
  lines.push(rows.join(',\n') + ';')
  lines.push('')
}

lines.push('COMMIT;')
lines.push('')

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')

const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(1)
console.log(`Written: ${outputPath} (${sizeKb} KB)`)
logSeedExportAdjustments(exportStats)
console.log(`Exported rows: ${preparedRecords.length}`)
