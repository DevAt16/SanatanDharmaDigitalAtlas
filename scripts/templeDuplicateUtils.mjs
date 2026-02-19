import { pathToFileURL } from 'url'

const COMMON_TEMPLE_WORDS = new Set([
  'temple',
  'mandir',
  'mahadev',
  'shiva',
  'shiv',
  'nath',
  'swamy',
  'swami',
  'sree',
  'sri',
  'ji',
])

export const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

const normalizeNameLoose = (value) =>
  normalizeText(String(value ?? '').replace(/\([^)]*\)/g, ' '))
    .split(' ')
    .filter((part) => part && !COMMON_TEMPLE_WORDS.has(part))
    .join(' ')

export const buildStrictKey = (temple) =>
  [
    normalizeText(temple?.name),
    normalizeText(temple?.state),
    normalizeText(temple?.city),
  ].join('|')

export const buildLooseKey = (temple) =>
  [
    normalizeNameLoose(temple?.name),
    normalizeText(temple?.state),
    normalizeText(temple?.city),
  ].join('|')

export const loadModule = async (absolutePath) => {
  const moduleUrl = `${pathToFileURL(absolutePath).href}?t=${Date.now()}-${Math.random()}`
  return import(moduleUrl)
}
