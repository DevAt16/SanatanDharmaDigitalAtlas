import fs from 'fs'
import path from 'path'
import { STORE_DIR, STORE_FILE, readNdjson, ensureDir } from './templeStoreUtils.mjs'

const SQL_FILE = path.join(STORE_DIR, 'temples.sql')

const esc = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

const escJson = (value) => esc(JSON.stringify(value))

const CREATE_TABLE = `\
DROP TABLE IF EXISTS \`temples\`;
CREATE TABLE \`temples\` (
  \`id\`              INT           NOT NULL AUTO_INCREMENT,
  \`slug\`            VARCHAR(512)  NOT NULL,
  \`mode\`            VARCHAR(32)   NOT NULL,
  \`name\`            TEXT          NOT NULL,
  \`state\`           VARCHAR(128)  NOT NULL,
  \`city\`            VARCHAR(128)  NOT NULL,
  \`region\`          TEXT,
  \`deity\`           TEXT,
  \`tradition\`       VARCHAR(128),
  \`tags\`            JSON,
  \`story\`           TEXT,
  \`highlight\`       TEXT,
  \`image\`           TEXT,
  \`credit\`          TEXT,
  \`creditUrl\`       TEXT,
  \`bestTime\`        TEXT,
  \`timings\`         TEXT,
  \`dressCode\`       TEXT,
  \`entryNotes\`      TEXT,
  \`rituals\`         JSON,
  \`festivals\`       JSON,
  \`moreDetails\`     JSON,
  \`addedAt\`         VARCHAR(64),
  \`sourceType\`      VARCHAR(64),
  \`sourceUrl\`       TEXT,
  \`confidenceScore\` DOUBLE,
  \`lastVerifiedAt\`  VARCHAR(64),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uq_slug\` (\`slug\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`

const records = readNdjson(STORE_FILE)

const insertLines = records.map((r) => {
  const values = [
    esc(r.id),  // slug
    esc(r.mode),
    esc(r.name),
    esc(r.state),
    esc(r.city),
    esc(r.region),
    esc(r.deity),
    esc(r.tradition),
    escJson(r.tags),
    esc(r.story),
    esc(r.highlight),
    esc(r.image),
    esc(r.credit),
    esc(r.creditUrl),
    esc(r.bestTime),
    esc(r.timings),
    esc(r.dressCode),
    esc(r.entryNotes),
    escJson(r.rituals),
    escJson(r.festivals),
    escJson(r.moreDetails),
    esc(r.addedAt),
    esc(r.sourceType),
    esc(r.sourceUrl),
    r.confidenceScore ?? 'NULL',
    esc(r.lastVerifiedAt),
  ]
  return `INSERT INTO \`temples\` (\`slug\`, \`mode\`, \`name\`, \`state\`, \`city\`, \`region\`, \`deity\`, \`tradition\`, \`tags\`, \`story\`, \`highlight\`, \`image\`, \`credit\`, \`creditUrl\`, \`bestTime\`, \`timings\`, \`dressCode\`, \`entryNotes\`, \`rituals\`, \`festivals\`, \`moreDetails\`, \`addedAt\`, \`sourceType\`, \`sourceUrl\`, \`confidenceScore\`, \`lastVerifiedAt\`) VALUES (${values.join(', ')});`
})

ensureDir(STORE_DIR)
fs.writeFileSync(SQL_FILE, CREATE_TABLE + insertLines.join('\n') + '\n', 'utf8')

console.log(`SQL exported: ${SQL_FILE}`)
console.log(`Records written: ${records.length}`)
