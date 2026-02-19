import fs from 'fs'
import path from 'path'
import {
  buildLooseKey,
  buildStrictKey,
  loadModule,
  normalizeText,
} from './templeDuplicateUtils.mjs'

const printUsageAndExit = () => {
  console.error(
    'Usage: node scripts/addTemples.mjs <state-file> <export-name> <input-json>'
  )
  console.error(
    'Example: node scripts/addTemples.mjs src/data/temples/madhyaPradesh.js madhyaPradeshTemples /tmp/new-temples.json'
  )
  process.exit(1)
}

const [, , stateFileArg, exportName, inputPathArg] = process.argv
if (!stateFileArg || !exportName || !inputPathArg) {
  printUsageAndExit()
}

const cwd = process.cwd()
const stateFilePath = path.resolve(cwd, stateFileArg)
const inputPath = path.resolve(cwd, inputPathArg)

if (!fs.existsSync(stateFilePath)) {
  console.error(`State file not found: ${stateFileArg}`)
  process.exit(1)
}
if (!fs.existsSync(inputPath)) {
  console.error(`Input JSON not found: ${inputPathArg}`)
  process.exit(1)
}

const moduleData = await loadModule(stateFilePath)
const existingTemples = moduleData[exportName]
if (!Array.isArray(existingTemples)) {
  console.error(`Export "${exportName}" is not an array in ${stateFileArg}`)
  process.exit(1)
}

const inputRaw = fs.readFileSync(inputPath, 'utf8')
let parsedInput
try {
  parsedInput = JSON.parse(inputRaw)
} catch (error) {
  console.error(`Invalid JSON at ${inputPathArg}: ${error.message}`)
  process.exit(1)
}

const incomingTemples = Array.isArray(parsedInput)
  ? parsedInput
  : Array.isArray(parsedInput?.temples)
    ? parsedInput.temples
    : Array.isArray(parsedInput?.results)
      ? parsedInput.results
      : null

if (!Array.isArray(incomingTemples)) {
  console.error(
    'Input JSON must be an array, or an object with "temples" / "results" array.'
  )
  process.exit(1)
}

const inferredState = normalizeText(existingTemples[0]?.state)
const strictKeySet = new Set()
const looseKeySet = new Set()
let globalTempleCount = 0
try {
  const globalTempleModule = await loadModule(path.resolve(cwd, 'src/data/temples/index.js'))
  const globalTemples = Array.isArray(globalTempleModule.templeData)
    ? globalTempleModule.templeData
    : []
  globalTempleCount = globalTemples.length
  for (const temple of globalTemples) {
    strictKeySet.add(buildStrictKey(temple))
    looseKeySet.add(buildLooseKey(temple))
  }
} catch (error) {
  console.warn(
    `Warning: could not load global temple index, continuing with state-level check only. (${error.message})`
  )
}

for (const temple of existingTemples) {
  strictKeySet.add(buildStrictKey(temple))
  looseKeySet.add(buildLooseKey(temple))
}

const nextTemples = [...existingTemples]
const added = []
const skipped = []

for (const rawTemple of incomingTemples) {
  if (!rawTemple || typeof rawTemple !== 'object') {
    skipped.push({ name: 'Unknown', reason: 'invalid_record' })
    continue
  }

  const candidate = { ...rawTemple }
  if (!candidate.state && inferredState) {
    candidate.state = existingTemples[0]?.state
  }

  const hasRequired = ['name', 'state', 'city'].every((field) =>
    normalizeText(candidate[field])
  )
  if (!hasRequired) {
    skipped.push({
      name: candidate.name || 'Unknown',
      reason: 'missing_required_fields(name/state/city)',
    })
    continue
  }

  const strictKey = buildStrictKey(candidate)
  const looseKey = buildLooseKey(candidate)
  const strictDuplicate = strictKeySet.has(strictKey)
  const looseDuplicate = looseKeySet.has(looseKey)
  if (strictDuplicate || looseDuplicate) {
    skipped.push({
      name: candidate.name,
      reason: strictDuplicate ? 'duplicate_strict(name+state+city)' : 'duplicate_loose',
    })
    continue
  }

  nextTemples.push(candidate)
  strictKeySet.add(strictKey)
  looseKeySet.add(looseKey)
  added.push(candidate.name)
}

const output = `export const ${exportName} = ${JSON.stringify(nextTemples, null, 2)};\n`
fs.writeFileSync(stateFilePath, output, 'utf8')

console.log(`State file: ${stateFileArg}`)
console.log(`Global pool checked: ${globalTempleCount || 'state-only'}`)
console.log(`Existing: ${existingTemples.length}`)
console.log(`Incoming: ${incomingTemples.length}`)
console.log(`Added: ${added.length}`)
console.log(`Skipped: ${skipped.length}`)
if (added.length) {
  console.log('\nAdded temples:')
  for (const name of added) console.log(`- ${name}`)
}
if (skipped.length) {
  console.log('\nSkipped temples:')
  for (const item of skipped) console.log(`- ${item.name}: ${item.reason}`)
}
