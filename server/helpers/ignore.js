const fs = require('fs-extra')
const path = require('path')
const ignore = require('ignore')

/* global WIKI */

function normalizeRelPath(relPath) {
  if (!relPath) return ''
  return relPath.replace(/\\/g, '/').replace(/^\.\/+/, '')
}

function cacheKey(repoPath) {
  return `wikijsignore:${path.resolve(repoPath)}`
}

function matches(ignoreChecker, relPath) {
  const normalized = normalizeRelPath(relPath)
  if (!normalized) return false
  return ignoreChecker.ignores(normalized) || ignoreChecker.ignores(`${normalized}/`)
}

async function loadIgnoreFile(repoPath) {
  const resolvedRepoPath = path.resolve(repoPath)
  const ig = ignore()

  const ignoreFilePath = path.join(resolvedRepoPath, '.wikijsignore')
  try {
    const contents = await fs.readFile(ignoreFilePath, 'utf8')
    const lines = contents.split(/\r?\n/)
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      if (line === '*' || line === '**/*' || line === '/*' || line === '/**') {
        WIKI.logger.warn(`(WIKIJSIGNORE) Pattern "${line}" will ignore almost everything in ${resolvedRepoPath}`)
      }

      try {
        ig.add(rawLine)
      } catch (err) {
        WIKI.logger.warn(`(WIKIJSIGNORE) Invalid pattern "${rawLine}" in ${ignoreFilePath} - Skipping...`)
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      WIKI.logger.warn(`(WIKIJSIGNORE) Failed to read ${ignoreFilePath} - Continuing without ignore rules.`)
      WIKI.logger.warn(err)
    }
  }

  // Always ignore the ignore file itself, regardless of user patterns/negations.
  ig.add('.wikijsignore')

  return ig
}

async function getIgnoreChecker(repoPath) {
  const key = cacheKey(repoPath)
  const cached = WIKI.cache.get(key)
  if (cached) return cached

  const ig = await loadIgnoreFile(repoPath)
  WIKI.cache.set(key, ig, 300)
  return ig
}

async function shouldIgnore(repoPath, relPath) {
  const ig = await getIgnoreChecker(repoPath)
  return matches(ig, relPath)
}

function clearCache(repoPath = null) {
  if (repoPath) {
    WIKI.cache.del(cacheKey(repoPath))
    return
  }

  for (const key of WIKI.cache.keys()) {
    if (key.startsWith('wikijsignore:')) {
      WIKI.cache.del(key)
    }
  }
}

module.exports = {
  loadIgnoreFile,
  getIgnoreChecker,
  shouldIgnore,
  clearCache,
  matches
}

