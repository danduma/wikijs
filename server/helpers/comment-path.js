const pageHelper = require('./page')
const _ = require('lodash')

/* global WIKI */

/**
 * Canonical comment path helper.
 *
 * Comments are shared across locales; therefore comment identity is based on a
 * canonical, locale-agnostic path.
 */
module.exports = {
  /**
   * Convert an incoming path (may include locale prefix like /en/foo/bar) into
   * a canonical comment identity key.
   *
   * @param {string} rawPath
   * @param {string} [localeOverride]
   * @returns {{ path: string, locale: string, key: string }} parsed parts and key
   */
  canonicalCommentPath (rawPath, localeOverride = null) {
    const parsed = pageHelper.parsePath(rawPath, { stripExt: true })
    const effectiveLocale = localeOverride || parsed.locale
    const includeLocale = _.get(WIKI, 'data.commentProvider.config.threadKeyIncludesLocale', false)
    const key = includeLocale ? `${effectiveLocale}/${parsed.path}` : parsed.path
    return { path: parsed.path, locale: effectiveLocale, key }
  }
}
