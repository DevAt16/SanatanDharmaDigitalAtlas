import { createReadStream, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const NDJSON_PATH = join(__dirname, '../data-store/temples.ndjson')
const OUT_PATH = join(__dirname, '../public/sitemap.xml')
const BASE_URL = 'https://jaibholenath.com'

const slugify = (value) =>
  String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const rl = createInterface({ input: createReadStream(NDJSON_PATH), crlfDelay: Infinity })
const templeUrls = []

rl.on('line', (line) => {
  if (!line.trim()) return
  try {
    const t = JSON.parse(line)
    const slug = slugify(`${t.name}-${t.city}-${t.state}`)
    templeUrls.push(`  <url><loc>${BASE_URL}/temple/${slug}</loc></url>`)
  } catch {
    // skip malformed lines
  }
})

rl.on('close', () => {
  const staticPages = ['', '/circuits', '/map', '/about', '/recent-discoveries']
  const staticUrls = staticPages.map((p) => `  <url><loc>${BASE_URL}${p}</loc></url>`)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...templeUrls].join('\n')}
</urlset>`
  writeFileSync(OUT_PATH, xml, 'utf8')
  console.log(`Sitemap written to public/sitemap.xml — ${templeUrls.length} temples + ${staticPages.length} static pages`)
})
