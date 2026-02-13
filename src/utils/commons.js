const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

const normalizeFileTitle = (title) => {
  if (!title) return ''
  return title.startsWith('File:') ? title : `File:${title}`
}

export const commonsFilePageUrl = (fileTitle) => {
  const normalized = normalizeFileTitle(fileTitle)
  return `https://commons.wikimedia.org/wiki/${encodeURIComponent(normalized.replace(/ /g, '_'))}`
}

export const commonsSpecialFilePathUrl = (fileTitle) => {
  const normalized = normalizeFileTitle(fileTitle)
  const fileName = normalized.replace(/^File:/, '').replace(/ /g, '_')
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`
}

export const searchCommonsImages = async (query, limit = 8) => {
  const url = new URL(COMMONS_API)
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrnamespace', '6') // File:
  url.searchParams.set('gsrsearch', query)
  url.searchParams.set('gsrlimit', String(limit))
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url|extmetadata')
  url.searchParams.set('iiurlwidth', '1600')

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Commons API request failed (${response.status})`)
  }
  const json = await response.json()
  const pages = Object.values(json?.query?.pages ?? {})
  return pages
    .map((page) => {
      const imageInfo = page?.imageinfo?.[0]
      const title = page?.title
      const filePageUrl = commonsFilePageUrl(title)
      const specialFilePathUrl = commonsSpecialFilePathUrl(title)
      const license =
        imageInfo?.extmetadata?.LicenseShortName?.value ||
        imageInfo?.extmetadata?.License?.value ||
        ''
      const description = imageInfo?.extmetadata?.ImageDescription?.value || ''
      return {
        title,
        imageUrl: specialFilePathUrl,
        filePageUrl,
        license,
        description,
        thumbUrl: imageInfo?.thumburl || imageInfo?.url || '',
      }
    })
    .filter((item) => item.title && item.imageUrl && item.filePageUrl)
}

export const pickBestCommonsImage = (candidates, { name = '', city = '' } = {}) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null

  const stopWords = new Set(['temple', 'swamy', 'swami', 'sri', 'shri', 'the', 'of', 'and'])
  const tokens = `${name} ${city}`
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean)
    .filter((token) => token.length >= 4 && !stopWords.has(token))

  const scoreCandidate = (candidate) => {
    const title = String(candidate?.title ?? '').toLowerCase()
    const license = String(candidate?.license ?? '').toLowerCase()
    const description = String(candidate?.description ?? '').toLowerCase()

    let score = 0
    if (license) score += 2
    if (title.includes('temple') || description.includes('temple')) score += 2
    if (title.includes('gopuram') || description.includes('gopuram')) score += 1

    for (const token of tokens) {
      if (title.includes(token) || description.includes(token)) score += 2
    }

    const badHints = ['logo', 'map', 'icon', 'seal', 'flag']
    for (const hint of badHints) {
      if (title.includes(hint) || description.includes(hint)) score -= 4
    }

    return score
  }

  const sorted = [...candidates].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
  return sorted[0] ?? null
}

