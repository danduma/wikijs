const express = require('express')
const http = require('http')
const https = require('https')
const { URL } = require('url')
const _ = require('lodash')

/* global WIKI */

const router = express.Router()

function getHttpModule(url) {
  return url.protocol === 'https:' ? https : http
}

function buildTargetUrl({ baseUrl, targetPathname, query }) {
  // baseUrl may include a path prefix, e.g. https://og.example.com/_og
  const base = new URL(baseUrl)
  const basePath = base.pathname.endsWith('/') ? base.pathname.slice(0, -1) : base.pathname
  base.pathname = `${basePath}${targetPathname.startsWith('/') ? '' : '/'}${targetPathname}`

  const v = _.trim(_.get(query, 'v', ''))
  const t = _.trim(_.get(query, 't', ''))
  if (v) base.searchParams.set('v', v)
  if (t) base.searchParams.set('t', t)

  return base
}

function setCachingHeaders(res, { hasVersion }) {
  if (hasVersion) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else {
    res.set('Cache-Control', 'public, max-age=60')
  }
}

async function proxyToOgService(req, res, targetPathname) {
  try {
    const enabled = _.get(WIKI, 'config.ogImage.enabled', false) === true
    if (!enabled) {
      return res.sendStatus(404)
    }

    const baseUrl = WIKI.models.ogImage.getServiceBaseUrl()
    if (!baseUrl) {
      return res.sendStatus(404)
    }

    const target = buildTargetUrl({
      baseUrl,
      targetPathname,
      query: req.query
    })

    const timeoutMs = _.toSafeInteger(_.get(WIKI, 'config.ogImage.timeoutMs', 5000)) || 5000
    const authMode = _.get(WIKI, 'config.ogImage.authMode', 'header')
    const sharedSecret = _.get(WIKI, 'config.ogImage.sharedSecret', '')
    const headerName = _.get(WIKI, 'config.ogImage.headerName', 'x-og-secret')

    const headers = {
      accept: 'image/*'
    }
    if (authMode === 'header' && headerName && sharedSecret) {
      headers[String(headerName).toLowerCase()] = String(sharedSecret)
    }

    const mod = getHttpModule(target)

    const upstreamReq = mod.request(target, { method: 'GET', headers }, upstreamRes => {
      const statusCode = upstreamRes.statusCode || 502
      if (statusCode < 200 || statusCode >= 300) {
        upstreamRes.resume()
        return res.sendStatus(502)
      }

      const contentType = upstreamRes.headers['content-type']
      res.status(200)
      if (contentType) res.set('Content-Type', contentType)
      setCachingHeaders(res, { hasVersion: !!req.query.v })

      upstreamRes.pipe(res)
    })

    upstreamReq.setTimeout(timeoutMs, () => {
      upstreamReq.destroy(new Error('Upstream timeout'))
    })

    upstreamReq.on('error', err => {
      WIKI.logger.warn(`OG image proxy error: ${err.message}`)
      if (!res.headersSent) {
        res.sendStatus(502)
      } else {
        res.end()
      }
    })

    upstreamReq.end()
  } catch (err) {
    WIKI.logger.warn(`OG image proxy failed: ${err.message}`)
    return res.sendStatus(500)
  }
}

router.get('/:locale([A-Za-z-]{2,10})/:pagePath(*)', async (req, res) => {
  const locale = req.params.locale
  let pagePath = req.params.pagePath || ''
  if (!pagePath.endsWith('.png')) {
    return res.sendStatus(404)
  }
  pagePath = pagePath.slice(0, -4)
  if (!pagePath) {
    return res.sendStatus(400)
  }
  const targetPathname = `/${encodeURIComponent(locale)}/${pagePath}.png`
  return proxyToOgService(req, res, targetPathname)
})

// Backwards-compatible legacy endpoint: /_og/123.png
router.get('/:pageId(\\d+)\\.png', async (req, res) => {
  const pageId = _.toSafeInteger(req.params.pageId)
  if (pageId < 1) {
    return res.sendStatus(400)
  }
  const targetPathname = `/${pageId}.png`
  return proxyToOgService(req, res, targetPathname)
})

module.exports = router
