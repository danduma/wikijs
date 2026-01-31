const pageHelper = require('../helpers/page')

/* global WIKI */

module.exports = function (req, res, next) {
  if (!WIKI.anonViewLimit || !WIKI.anonViewLimit.isEnabled()) return next()
  if (req.method !== 'GET') return next()
  if (req.path === '/graphql' || req.path.startsWith('/_') || req.path.startsWith('/api')) return next()

  const rawPath = req.path.replace(/^\\//, '')
  if (pageHelper.isReservedPath(rawPath)) return next()

  req.anonViewLimit = WIKI.anonViewLimit.buildContext(req, res)
  return next()
}
