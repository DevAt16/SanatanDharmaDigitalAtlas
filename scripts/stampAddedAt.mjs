import fs from 'fs'
import path from 'path'
import { loadModule } from './templeDuplicateUtils.mjs'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const pad2 = (value) => String(value).padStart(2, '0')
const toIstIso = (date) => {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS)
  const year = istDate.getUTCFullYear()
  const month = pad2(istDate.getUTCMonth() + 1)
  const day = pad2(istDate.getUTCDate())
  const hours = pad2(istDate.getUTCHours())
  const minutes = pad2(istDate.getUTCMinutes())
  const seconds = pad2(istDate.getUTCSeconds())
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`
}
const getCurrentIstIso = (offsetSeconds = 0) =>
  toIstIso(new Date(Date.now() + offsetSeconds * 1000))

const printUsageAndExit = () => {
  console.error(
    'Usage: node scripts/stampAddedAt.mjs <state-file> <export-name> [--only-is-new] [--from-prefix=YYYY-MM-DD]'
  )
  console.error(
    'Example: node scripts/stampAddedAt.mjs src/data/temples/madhyaPradesh.js madhyaPradeshTemples --only-is-new'
  )
  process.exit(1)
}

const [, , stateFileArg, exportName, ...rawFlags] = process.argv
if (!stateFileArg || !exportName) {
  printUsageAndExit()
}

const flags = new Set(rawFlags.filter((arg) => arg.startsWith('--')))
const onlyIsNew = flags.has('--only-is-new')
const fromPrefixFlag = rawFlags.find((arg) => arg.startsWith('--from-prefix='))
const fromPrefix = fromPrefixFlag ? fromPrefixFlag.slice('--from-prefix='.length) : ''

const cwd = process.cwd()
const stateFilePath = path.resolve(cwd, stateFileArg)
if (!fs.existsSync(stateFilePath)) {
  console.error(`State file not found: ${stateFileArg}`)
  process.exit(1)
}

const moduleData = await loadModule(stateFilePath)
const templeList = moduleData[exportName]
if (!Array.isArray(templeList)) {
  console.error(`Export "${exportName}" is not an array in ${stateFileArg}`)
  process.exit(1)
}

let touched = 0
const stamped = templeList.map((temple) => {
  if (!temple || typeof temple !== 'object') return temple
  if (onlyIsNew && !temple.isNew) return temple
  if (fromPrefix && !String(temple.addedAt || '').startsWith(fromPrefix)) return temple
  touched += 1
  return {
    ...temple,
    addedAt: getCurrentIstIso(touched - 1),
  }
})

const output = `export const ${exportName} = ${JSON.stringify(stamped, null, 2)};\n`
fs.writeFileSync(stateFilePath, output, 'utf8')

console.log(`State file: ${stateFileArg}`)
console.log(`Temples scanned: ${templeList.length}`)
console.log(`Temples updated: ${touched}`)
if (onlyIsNew) {
  console.log('Filter: isNew=true')
}
if (fromPrefix) {
  console.log(`Filter: addedAt starts with "${fromPrefix}"`)
}
