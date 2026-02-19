import fs from 'fs'
import path from 'path'
import { buildLooseKey, buildStrictKey, loadModule } from './templeDuplicateUtils.mjs'

const templesDir = path.resolve(process.cwd(), 'src/data/temples')
const files = fs
  .readdirSync(templesDir)
  .filter((file) => file.endsWith('.js') && file !== 'index.js')
  .sort()

const strictIssues = []
const looseWarnings = []

for (const fileName of files) {
  const absolutePath = path.join(templesDir, fileName)
  const moduleData = await loadModule(absolutePath)

  for (const [exportName, value] of Object.entries(moduleData)) {
    if (!Array.isArray(value)) continue

    const strictMap = new Map()
    const looseMap = new Map()

    value.forEach((temple, index) => {
      if (!temple || typeof temple !== 'object') return
      const record = {
        file: `src/data/temples/${fileName}`,
        exportName,
        index: index + 1,
        name: temple.name || 'Unknown',
        city: temple.city || 'Unknown',
        state: temple.state || 'Unknown',
      }

      const strictKey = buildStrictKey(temple)
      const looseKey = buildLooseKey(temple)

      if (!strictMap.has(strictKey)) strictMap.set(strictKey, [])
      strictMap.get(strictKey).push(record)

      if (!looseMap.has(looseKey)) looseMap.set(looseKey, [])
      looseMap.get(looseKey).push(record)
    })

    for (const records of strictMap.values()) {
      if (records.length > 1) strictIssues.push(records)
    }

    for (const records of looseMap.values()) {
      if (records.length <= 1) continue
      const uniqueStrict = new Set(records.map((r) => `${r.name}|${r.city}|${r.state}`))
      if (uniqueStrict.size > 1) looseWarnings.push(records)
    }
  }
}

if (strictIssues.length === 0) {
  console.log('No strict duplicates found in temple files.')
} else {
  console.log(`Strict duplicates found: ${strictIssues.length}`)
  strictIssues.forEach((group, groupIndex) => {
    console.log(`\n[Strict ${groupIndex + 1}]`)
    group.forEach((record) => {
      console.log(
        `- ${record.name} | ${record.city}, ${record.state} (${record.file} -> ${record.exportName}[${record.index}])`
      )
    })
  })
}

if (looseWarnings.length) {
  console.log(`\nLoose duplicate warnings: ${looseWarnings.length}`)
  looseWarnings.forEach((group, groupIndex) => {
    console.log(`\n[Loose ${groupIndex + 1}]`)
    group.forEach((record) => {
      console.log(
        `- ${record.name} | ${record.city}, ${record.state} (${record.file} -> ${record.exportName}[${record.index}])`
      )
    })
  })
}

process.exit(strictIssues.length ? 1 : 0)
