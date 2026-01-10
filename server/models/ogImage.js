const _ = require('lodash')

/* global WIKI */

function normalizeBaseUrl(url) {
  const trimmed = _.trim(url || '')
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

function toVersionToken(page) {
  const updatedAt = _.get(page, 'updatedAt', '')
  const ts = Date.parse(updatedAt)
  if (Number.isFinite(ts) && ts > 0) return String(ts)
  return ''
}

function pickTemplate(page) {
  const configuredDefault = _.get(WIKI, 'config.ogImage.defaultTemplate', 'default')
  const pagePath = _.get(page, 'path', '')
  if (_.isString(pagePath) && (pagePath === 'docs' || pagePath.startsWith('docs/'))) {
    return 'docs'
  }
  return configuredDefault || 'default'
}

module.exports = {
  isEnabled() {
    return _.get(WIKI, 'config.ogImage.enabled', false) === true
  },

  /**
   * Build the WikiJS proxy URL for the OpenGraph image.
   * MUST be pure (no I/O, no awaits).
   */
  getImageUrl(page) {
    if (!this.isEnabled()) return ''
    const locale = _.trim(_.get(page, 'localeCode', _.get(page, 'locale', '')))
    const pagePath = _.trim(_.get(page, 'path', ''))
    if (!locale || !pagePath) return ''

    const v = toVersionToken(page)
    const t = pickTemplate(page)

    const qs = []
    if (v) qs.push(`v=${encodeURIComponent(v)}`)
    if (t) qs.push(`t=${encodeURIComponent(t)}`)

    return `/_og/${encodeURIComponent(locale)}/${pagePath}.png${qs.length > 0 ? `?${qs.join('&')}` : ''}`
  },

  getServiceBaseUrl() {
    return normalizeBaseUrl(_.get(WIKI, 'config.ogImage.serviceBaseUrl', ''))
  }
}
