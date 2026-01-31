const _ = require('lodash')
const crypto = require('crypto')
const cheerio = require('cheerio')
const { nanoid } = require('nanoid')
const RateLimiterKnex = require('../helpers/RateLimiterKnex')

/* global WIKI */

const COOKIE_NAME = 'anon_view_id'
const BOT_REGEX = /bot|googlebot|bingbot|duckduckbot|yandex|baiduspider|crawler|spider|robot|crawling/i

function normalizePath(value) {
  if (!value) return ''
  return _.trim(value, '/').toLowerCase()
}

function toArray(value) {
  if (_.isArray(value)) return value
  if (_.isString(value)) {
    return value.split(',').map(v => _.trim(v)).filter(v => v.length > 0)
  }
  return []
}

module.exports = {
  init () {
    this.refresh()
    return this
  },
  refresh () {
    const cfg = this.getConfig()
    const duration = Math.max(1, _.toInteger(cfg.resetHours)) * 3600
    const points = Math.max(1, _.toInteger(cfg.count))
    const ipOnlyPoints = Math.max(points, Math.ceil(points * 1.5))

    this.limiter = new RateLimiterKnex({
      storeClient: WIKI.models.knex,
      tableName: 'rate_limits',
      tableCreated: true,
      points,
      duration,
      keyPrefix: 'anon_view'
    })

    this.limiterIpOnly = new RateLimiterKnex({
      storeClient: WIKI.models.knex,
      tableName: 'rate_limits',
      tableCreated: true,
      points: ipOnlyPoints,
      duration,
      keyPrefix: 'anon_view_ip'
    })
  },
  getConfig () {
    return _.defaultsDeep({}, WIKI.config.anonViewLimit, {
      enabled: false,
      count: 3,
      resetHours: 24,
      exemptPaths: [],
      exemptTags: [],
      exemptBots: false,
      truncatePercent: 30,
      hashSecret: '',
      warnThreshold: 1,
      noIndexOnLimit: true
    })
  },
  getCtaConfig () {
    return _.defaultsDeep({}, WIKI.config.conversionCta, {
      enabled: true,
      variants: ['default'],
      frequencyHours: 24,
      softPromptPages: 1
    })
  },
  isEnabled () {
    return this.getConfig().enabled === true
  },
  getHashSecret () {
    const cfg = this.getConfig()
    if (_.isString(cfg.hashSecret) && cfg.hashSecret.length > 0) {
      return cfg.hashSecret
    }
    if (_.isString(WIKI.config.sessionSecret) && WIKI.config.sessionSecret.length > 0) {
      WIKI.logger.warn('Anon view limit hashSecret is not set. Falling back to sessionSecret.')
      return WIKI.config.sessionSecret
    }
    return 'wikijs-anon-view-limit'
  },
  hashIp (ip) {
    if (!ip) return 'unknown'
    return crypto.createHmac('sha256', this.getHashSecret()).update(ip).digest('hex')
  },
  ensureCookie (req, res) {
    if (!req.cookies) return null
    let cookieId = req.cookies[COOKIE_NAME]
    if (!cookieId) {
      cookieId = nanoid(16)
      const resetHours = Math.max(1, _.toInteger(this.getConfig().resetHours))
      res.cookie(COOKIE_NAME, cookieId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: resetHours * 3600 * 1000
      })
    }
    return cookieId
  },
  isBot (userAgent) {
    if (!this.getConfig().exemptBots) return false
    if (!_.isString(userAgent)) return false
    return BOT_REGEX.test(userAgent)
  },
  isExemptPath (pathValue) {
    const cfg = this.getConfig()
    const normalized = normalizePath(pathValue)
    if (!normalized) return false
    if (normalized === 'home') return true
    const exemptPaths = toArray(cfg.exemptPaths).map(normalizePath)
    return exemptPaths.some(exempt => {
      if (!exempt) return false
      const isWildcard = exempt.endsWith('*')
      const base = isWildcard ? exempt.slice(0, -1) : exempt
      if (!base) return false
      if (isWildcard) {
        return normalized.startsWith(base)
      }
      return normalized === base || normalized.startsWith(`${base}/`)
    })
  },
  isExemptTags (tags = []) {
    const cfg = this.getConfig()
    const exemptTags = toArray(cfg.exemptTags).map(t => t.toLowerCase())
    if (exemptTags.length === 0) return false
    const tagValues = tags.map(tag => {
      if (_.isString(tag)) return tag.toLowerCase()
      return _.get(tag, 'tag', '').toLowerCase()
    }).filter(Boolean)
    return tagValues.some(tag => exemptTags.includes(tag))
  },
  pickVariant (seed, variants) {
    const list = _.isArray(variants) && variants.length > 0 ? variants : ['default']
    if (!seed) return list[0]
    const hash = crypto.createHash('md5').update(seed).digest('hex')
    const idx = parseInt(hash.substring(0, 8), 16) % list.length
    return list[idx]
  },
  async consumeView ({ ipHash, cookieId }) {
    const key = cookieId ? `${ipHash}:${cookieId}` : `${ipHash}`
    const limiter = cookieId ? this.limiter : this.limiterIpOnly
    try {
      const res = await limiter.consume(key, 1)
      return {
        limitReached: false,
        remainingViews: res.remainingPoints
      }
    } catch (err) {
      return {
        limitReached: true,
        remainingViews: 0
      }
    }
  },
  truncateContent (html, percent) {
    if (!_.isString(html)) return ''
    const safePercent = Math.min(100, Math.max(1, _.toInteger(percent || 30)))
    const $ = cheerio.load(html, { decodeEntities: false })
    let $root = $('body')
    if ($root.length === 0) $root = $.root()

    const paragraphs = $root.find('p')
    if (paragraphs.length === 0) {
      const children = $root.children()
      const keepCount = Math.max(1, Math.ceil(children.length * (safePercent / 100)))
      children.slice(keepCount).remove()
      return $root.html()
    }

    let total = 0
    paragraphs.each((i, el) => { total += $(el).text().length })
    const cutoff = Math.max(1, Math.floor(total * (safePercent / 100)))

    let acc = 0
    let lastKeepIdx = paragraphs.length - 1
    paragraphs.each((i, el) => {
      acc += $(el).text().length
      if (acc >= cutoff) {
        lastKeepIdx = i
        return false
      }
    })

    const lastKeep = paragraphs.eq(lastKeepIdx)
    lastKeep.nextAll().remove()
    return $root.html()
  },
  trackEvent (event, data = {}) {
    if (!event) return
    WIKI.logger.info(`Anon view limit: ${event}`, data)
  },
  buildContext (req, res) {
    const ip = req.ip || req.connection?.remoteAddress || ''
    const ipHash = this.hashIp(ip)
    const cookieId = this.ensureCookie(req, res)
    const userAgent = req.get('user-agent') || ''
    return {
      ip,
      ipHash,
      cookieId,
      userAgent,
      isBot: this.isBot(userAgent)
    }
  },
  async evaluate (req, res, pageArgs, page) {
    const cfg = this.getConfig()
    const ctaCfg = this.getCtaConfig()

    if (!cfg.enabled) return null
    if (!req.user || req.user.id !== WIKI.auth.guest.id) return null

    const userAgent = req.get('user-agent') || ''
    if (this.isBot(userAgent)) return {
      enabled: true,
      exemptReason: 'bot',
      ctaEnabled: false
    }

    const context = this.buildContext(req, res)
    if (this.isExemptPath(pageArgs.path)) return {
      enabled: true,
      exemptReason: 'path',
      ctaEnabled: false
    }

    if (this.isExemptTags(pageArgs.tags)) return {
      enabled: true,
      exemptReason: 'tag',
      ctaEnabled: false
    }

    const result = await this.consumeView({
      ipHash: context.ipHash,
      cookieId: context.cookieId
    })

    const remainingViews = _.toInteger(result.remainingViews)
    const warnThreshold = Math.max(0, _.toInteger(cfg.warnThreshold))
    const softPromptThreshold = Math.max(0, _.toInteger(ctaCfg.softPromptPages))

    const limitReached = result.limitReached === true
    const warnReached = !limitReached && warnThreshold > 0 && remainingViews <= warnThreshold
    const softPrompt = !limitReached && softPromptThreshold > 0 && remainingViews <= softPromptThreshold

    const ctaEnabled = ctaCfg.enabled === true
    const ctaVariant = this.pickVariant(context.cookieId || context.ipHash, ctaCfg.variants)

    if (limitReached) {
      this.trackEvent('limit-reached', { path: pageArgs.path })
    } else if (softPrompt) {
      this.trackEvent('soft-prompt', { path: pageArgs.path })
    }

    return {
      enabled: true,
      limitReached,
      remainingViews,
      warnReached,
      softPrompt,
      ctaEnabled,
      ctaVariant,
      noIndex: limitReached && cfg.noIndexOnLimit === true,
      ipOnly: !context.cookieId,
      truncatePercent: cfg.truncatePercent
    }
  }
}
