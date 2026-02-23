import fs from 'fs'
import path from 'path'
import {
  buildLooseKey,
  buildStrictKey,
  loadModule,
  normalizeText,
  resolveDistrict,
} from './templeDuplicateUtils.mjs'

const args = process.argv.slice(2)

const printUsageAndExit = (code = 1) => {
  console.log(
    'Usage: node scripts/validateTempleDataset.mjs <state-file> <export-name> [--shiva-only] [--state=<state-name>]'
  )
  console.log(
    'Example: node scripts/validateTempleDataset.mjs src/data/temples/madhyaPradesh.js madhyaPradeshTemples --shiva-only'
  )
  process.exit(code)
}

if (args.includes('--help') || args.includes('-h')) {
  printUsageAndExit(0)
}

const [stateFileArg, exportName, ...flagArgs] = args
if (!stateFileArg || !exportName) {
  printUsageAndExit(1)
}

const flags = new Map(
  flagArgs
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [k, v] = arg.slice(2).split('=')
      return [k, v ?? 'true']
    })
)

const shivaOnly = flags.get('shiva-only') === 'true'
const expectedStateOverride = flags.get('state') || ''

const cwd = process.cwd()
const stateFilePath = path.resolve(cwd, stateFileArg)

if (!fs.existsSync(stateFilePath)) {
  console.error(`State file not found: ${stateFileArg}`)
  process.exit(1)
}

const mod = await loadModule(stateFilePath)
const records = mod[exportName]
if (!Array.isArray(records)) {
  console.error(`Export "${exportName}" is not an array in ${stateFileArg}`)
  process.exit(1)
}

const isMeaningful = (value) => {
  const t = normalizeText(value)
  return Boolean(t && t !== 'not available' && t !== 'na' && t !== 'n a')
}

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim())
const isDefaultTempleSvg = (value) =>
  /^\/temples\/temple-0[1-6]\.svg$/i.test(String(value || '').trim())

const getAllSourceUrls = (record) => {
  const details = record?.moreDetails
  if (!details || typeof details !== 'object') return []

  const buckets = ['sources', 'puranicSources', 'folkloreSources']
  const urls = []
  for (const key of buckets) {
    const list = details[key]
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const url = item?.url
      if (isHttpUrl(url)) urls.push(url.trim())
    }
  }
  return [...new Set(urls)]
}

const looksShaiva = (deity) => {
  const d = normalizeText(deity)
  if (!d) return false
  return (
    d.includes('shiva') ||
    d.includes('mahadev') ||
    d.includes('bhairav') ||
    d.includes('rudra') ||
    d.includes('pashupati')
  )
}

const errors = []
const warnings = []
const strictMap = new Map()
const looseMap = new Map()

const expectedState = expectedStateOverride || records[0]?.state || ''

records.forEach((record, index) => {
  const lineRef = `${stateFileArg} -> ${exportName}[${index + 1}]`
  const name = String(record?.name || '').trim()
  const state = String(record?.state || '').trim()
  const city = String(record?.city || '').trim()
  const district = resolveDistrict(record)
  const hasLocality =
    isMeaningful(city) || isMeaningful(record?.town) || isMeaningful(record?.village) || district

  if (!isMeaningful(name)) {
    errors.push(`${lineRef}: missing name`)
  }
  if (!isMeaningful(state)) {
    errors.push(`${lineRef}: missing state`)
  }
  if (!hasLocality) {
    errors.push(`${lineRef}: missing location (city/town/village/district)`)
  }
  if (isMeaningful(expectedState) && normalizeText(state) !== normalizeText(expectedState)) {
    errors.push(`${lineRef}: state mismatch (got "${state}", expected "${expectedState}")`)
  }
  if (!isMeaningful(district)) {
    warnings.push(`${lineRef}: missing district field or district in region`)
  }

  if (shivaOnly && !looksShaiva(record?.deity)) {
    errors.push(`${lineRef}: deity is not Shiva/Shaiva-compatible ("${record?.deity || ''}")`)
  }

  if (!isMeaningful(record?.verificationStatus)) {
    warnings.push(`${lineRef}: missing verificationStatus`)
  }
  if (!isMeaningful(record?.lastVerifiedAt)) {
    warnings.push(`${lineRef}: missing lastVerifiedAt`)
  }

  if (!isMeaningful(record?.image)) {
    warnings.push(`${lineRef}: missing image`)
  }
  const usesDefaultTempleSvg = isDefaultTempleSvg(record?.image)
  if (!isMeaningful(record?.credit) && !usesDefaultTempleSvg) {
    warnings.push(`${lineRef}: missing credit`)
  }
  if (!isMeaningful(record?.creditUrl) && !usesDefaultTempleSvg) {
    warnings.push(`${lineRef}: missing creditUrl`)
  }

  const sourceUrls = getAllSourceUrls(record)
  if (!sourceUrls.length) {
    warnings.push(`${lineRef}: missing source URL(s) in moreDetails`)
  }

  const strictKey = buildStrictKey(record)
  const looseKey = buildLooseKey(record)
  if (!strictMap.has(strictKey)) strictMap.set(strictKey, [])
  strictMap.get(strictKey).push({ index: index + 1, name, city, district, state })

  if (!looseMap.has(looseKey)) looseMap.set(looseKey, [])
  looseMap.get(looseKey).push({ index: index + 1, name, city, district, state })
})

for (const group of strictMap.values()) {
  if (group.length <= 1) continue
  const header = group[0]
  const entries = group
    .map((r) => `${r.index}:${r.name} (${r.city}, ${r.district}, ${r.state})`)
    .join(' | ')
  errors.push(
    `${stateFileArg}: strict duplicate key for "${header.name}" at ${header.city}, ${header.district}: ${entries}`
  )
}

for (const group of looseMap.values()) {
  if (group.length <= 1) continue
  const uniqueStrict = new Set(
    group.map((r) => `${normalizeText(r.name)}|${normalizeText(r.state)}|${normalizeText(r.district)}|${normalizeText(r.city)}`)
  )
  if (uniqueStrict.size <= 1) continue
  const entries = group
    .map((r) => `${r.index}:${r.name} (${r.city}, ${r.district}, ${r.state})`)
    .join(' | ')
  warnings.push(`${stateFileArg}: loose duplicate warning: ${entries}`)
}

console.log(`File: ${stateFileArg}`)
console.log(`Export: ${exportName}`)
console.log(`Records: ${records.length}`)
console.log(`Expected state: ${expectedState || 'Not set'}`)
console.log(`Shiva-only mode: ${shivaOnly ? 'ON' : 'OFF'}`)
console.log(`Errors: ${errors.length}`)
console.log(`Warnings: ${warnings.length}`)

if (errors.length) {
  console.log('\nErrors:')
  errors.forEach((item) => console.log(`- ${item}`))
}

if (warnings.length) {
  console.log('\nWarnings:')
  warnings.forEach((item) => console.log(`- ${item}`))
}

process.exit(errors.length ? 1 : 0)
