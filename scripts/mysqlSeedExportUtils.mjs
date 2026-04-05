const NULL_STRING_VALUES = new Set(['', 'Not Available'])

export const VARCHAR_LIMITS = Object.freeze({
  slug: 255,
  name: 255,
  name_hi: 255,
  state: 100,
  city: 150,
  region: 255,
  deity: 255,
  tradition: 100,
  highlight: 700,
  highlight_hi: 700,
  image: 500,
  image_credit: 200,
  image_credit_url: 500,
  best_time: 255,
  timings: 255,
  dress_code: 255,
  source_type: 100,
  source_title: 300,
  source_url: 500,
})

const charLength = (value) => Array.from(String(value)).length

const clipChars = (value, maxChars) => {
  const chars = Array.from(String(value))
  if (chars.length <= maxChars) return String(value)
  return chars.slice(0, maxChars).join('')
}

const noteTruncation = (stats, field) => {
  if (!stats) return
  stats.fieldTruncations.set(field, (stats.fieldTruncations.get(field) || 0) + 1)
}

export const createSeedExportStats = () => ({
  slugCollisionsResolved: 0,
  fieldTruncations: new Map(),
})

export const fitVarchar = (value, field, stats) => {
  if (value === null || value === undefined) return value

  const maxChars = VARCHAR_LIMITS[field]
  if (!maxChars) return String(value)

  const raw = String(value)
  if (charLength(raw) <= maxChars) return raw

  noteTruncation(stats, field)
  return clipChars(raw, maxChars)
}

export const fitNullableVarchar = (value, field, stats) => {
  if (value === null || value === undefined) return null

  const raw = String(value)
  if (NULL_STRING_VALUES.has(raw)) return null

  return fitVarchar(raw, field, stats)
}

const trimForSuffix = (base, maxChars, suffix, stats) => {
  const allowedBaseChars = Math.max(maxChars - charLength(suffix), 0)
  if (charLength(base) <= allowedBaseChars) return base

  noteTruncation(stats, 'slug')
  return clipChars(base, allowedBaseChars)
}

export const uniquifySlug = (slug, usedSlugs, stats) => {
  const base = fitVarchar(slug ?? '', 'slug', stats) ?? ''

  let candidate = base
  let suffixIndex = 1

  while (usedSlugs.has(candidate)) {
    suffixIndex += 1
    const suffix = `-${suffixIndex}`
    candidate = `${trimForSuffix(base, VARCHAR_LIMITS.slug, suffix, stats)}${suffix}`
  }

  usedSlugs.add(candidate)
  if (candidate !== base) {
    stats.slugCollisionsResolved += 1
  }

  return candidate
}

export const formatSeedExportAdjustments = (stats) => {
  const lines = []

  if (stats.slugCollisionsResolved > 0) {
    lines.push(`-- Slug collisions resolved: ${stats.slugCollisionsResolved}`)
  }

  if (stats.fieldTruncations.size > 0) {
    const details = [...stats.fieldTruncations.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([field, count]) => `${field}=${count}`)
      .join(', ')
    lines.push(`-- Truncated schema-bound values: ${details}`)
  }

  return lines
}

export const logSeedExportAdjustments = (stats, log = console.log) => {
  for (const line of formatSeedExportAdjustments(stats)) {
    log(line.replace(/^-- /, ''))
  }
}
