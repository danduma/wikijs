const express = require('express')
const rp = require('request-promise')

/* global WIKI */

const router = express.Router()

const REQUEST_TEXT_MAX = 5000
const TITLE_MAX = 160
const DESCRIPTION_MAX = 5000
const MENTIONED_PAGES_MAX = 20

function isAuthenticatedUser(req) {
  return req.user && req.user.id >= 1 && req.user.id !== 2
}

function ensureAuthenticated(req, res) {
  if (!isAuthenticatedUser(req)) {
    res.status(401).json({ error: 'Authentication required' })
    return false
  }
  return true
}

function normalizeBaseUrl(raw) {
  return String(raw || '').trim().replace(/\/+$/, '')
}

function getProxyConfig() {
  const evergreenApiUrl = normalizeBaseUrl(WIKI.config.pageRequest?.evergreenApiUrl || process.env.EVERGREEN_API_URL)
  const evergreenApiKey = String(WIKI.config.pageRequest?.evergreenApiKey || process.env.EVERGREEN_API_KEY || '').trim()
  if (!evergreenApiUrl) {
    throw new Error('EVERGREEN_API_URL is not configured')
  }
  if (!evergreenApiKey) {
    throw new Error('EVERGREEN_API_KEY is not configured')
  }
  return { evergreenApiUrl, evergreenApiKey }
}

function normalizeRequestedBy(req) {
  const user = req.user || {}
  const requestedBy = {
    wikijs_user_id: String(user.id || '').trim()
  }
  if (user.name) {
    requestedBy.display_name = String(user.name).trim()
  }
  if (user.email) {
    requestedBy.email = String(user.email).trim()
  }
  return requestedBy
}

function normalizeMentionedPages(value) {
  if (!Array.isArray(value)) {
    return []
  }
  const seen = new Set()
  const normalized = []
  for (const raw of value) {
    if (typeof raw !== 'string') {
      continue
    }
    const candidate = raw.trim()
    if (!candidate || seen.has(candidate)) {
      continue
    }
    seen.add(candidate)
    normalized.push(candidate)
    if (normalized.length >= MENTIONED_PAGES_MAX) {
      break
    }
  }
  return normalized
}

function parseUpstreamError(err, fallbackMessage) {
  if (err && err.error) {
    if (typeof err.error === 'string' && err.error.trim()) {
      return err.error.trim()
    }
    if (err.error.detail && String(err.error.detail).trim()) {
      return String(err.error.detail).trim()
    }
    if (err.error.error && String(err.error.error).trim()) {
      return String(err.error.error).trim()
    }
  }
  if (err && err.message && String(err.message).trim()) {
    return String(err.message).trim()
  }
  return fallbackMessage
}

router.get('/requestpage', async (req, res) => {
  if (!isAuthenticatedUser(req)) {
    res.cookie('loginRedirect', req.path, { maxAge: 15 * 60 * 1000 })
    return res.redirect('/login')
  }
  res.render('pagerequest')
})

router.post('/api/page-requests/title-preview', async (req, res) => {
  if (!ensureAuthenticated(req, res)) {
    return
  }
  const requestText = typeof req.body?.request_text === 'string' ? req.body.request_text.trim() : ''
  if (!requestText) {
    return res.status(400).json({ error: 'request_text is required' })
  }
  if (requestText.length > REQUEST_TEXT_MAX) {
    return res.status(400).json({ error: `request_text must be <= ${REQUEST_TEXT_MAX} characters` })
  }

  let cfg
  try {
    cfg = getProxyConfig()
  } catch (err) {
    WIKI.logger.warn(`Page request title-preview config error: ${err.message}`)
    return res.status(503).json({ error: 'Page request service is not configured' })
  }

  try {
    const response = await rp({
      method: 'POST',
      uri: `${cfg.evergreenApiUrl}/api/page-requests/title-preview`,
      headers: {
        'X-API-Key': cfg.evergreenApiKey
      },
      body: {
        request_text: requestText
      },
      json: true,
      timeout: 15000
    })
    const title = typeof response?.title === 'string' ? response.title.trim() : ''
    if (!title) {
      return res.status(502).json({ error: 'Invalid title response from page request service' })
    }
    return res.json({ title })
  } catch (err) {
    WIKI.logger.warn(`Page request title-preview failed: ${err.message}`)
    const statusCode = Number(err.statusCode) >= 400 ? Number(err.statusCode) : 502
    return res.status(statusCode).json({
      error: parseUpstreamError(err, 'Failed to generate title preview')
    })
  }
})

router.post('/api/page-requests', async (req, res) => {
  if (!ensureAuthenticated(req, res)) {
    return
  }
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : ''
  if (!title) {
    return res.status(400).json({ error: 'title is required' })
  }
  if (!description) {
    return res.status(400).json({ error: 'description is required' })
  }
  if (title.length > TITLE_MAX) {
    return res.status(400).json({ error: `title must be <= ${TITLE_MAX} characters` })
  }
  if (description.length > DESCRIPTION_MAX) {
    return res.status(400).json({ error: `description must be <= ${DESCRIPTION_MAX} characters` })
  }

  let cfg
  try {
    cfg = getProxyConfig()
  } catch (err) {
    WIKI.logger.warn(`Page request create config error: ${err.message}`)
    return res.status(503).json({ error: 'Page request service is not configured' })
  }

  try {
    const response = await rp({
      method: 'POST',
      uri: `${cfg.evergreenApiUrl}/api/page-requests`,
      headers: {
        'X-API-Key': cfg.evergreenApiKey
      },
      body: {
        title,
        description,
        mentioned_pages: normalizeMentionedPages(req.body?.mentioned_pages),
        requested_by: normalizeRequestedBy(req)
      },
      json: true,
      timeout: 20000
    })
    return res.json({
      ticket: response?.ticket || null
    })
  } catch (err) {
    WIKI.logger.warn(`Page request create failed: ${err.message}`)
    const statusCode = Number(err.statusCode) >= 400 ? Number(err.statusCode) : 502
    return res.status(statusCode).json({
      error: parseUpstreamError(err, 'Failed to create page request')
    })
  }
})

module.exports = router
