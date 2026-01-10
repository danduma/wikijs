const _ = require('lodash')

/* global WIKI */

/**
 * SEO Middleware
 *
 * @param      {Express Request}   req     Express request object
 * @param      {Express Response}  res     Express response object
 * @param      {Function}          next    next callback function
 * @return     {any}               void
 */
module.exports = function (req, res, next) {
  if (req.path.length > 1 && _.endsWith(req.path, '/')) {
    let query = req.url.slice(req.path.length) || ''
    res.redirect(301, req.path.slice(0, -1) + query)
  } else {
    _.set(res.locals, 'pageMeta.url', `${WIKI.config.host}${req.path}`)
    // Ensure OG image URL is absolute at render time (crawlers often require absolute URLs).
    if (!res.__ogImageRenderWrapped) {
      res.__ogImageRenderWrapped = true
      const origRender = res.render
      res.render = function (view, locals, cb) {
        try {
          const img = _.get(res.locals, 'pageMeta.image', '')
          if (_.isString(img) && img.length > 0 && !img.startsWith('http://') && !img.startsWith('https://') && img.startsWith('/')) {
            _.set(res.locals, 'pageMeta.image', `${WIKI.config.host}${img}`)
          }
        } catch (err) {}
        return origRender.call(this, view, locals, cb)
      }
    }
    return next()
  }
}
