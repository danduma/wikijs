const express = require('express')
const router = express.Router()
const pageHelper = require('../helpers/page')
const ignoreHelper = require('../helpers/ignore')
const _ = require('lodash')
const CleanCSS = require('clean-css')
const moment = require('moment')
const qs = require('querystring')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs-extra')

/* global WIKI */

const tmplCreateRegex = /^[0-9]+(,[0-9]+)?$/
const sitemapCacheTTL = 60 * 1000
const sitemapCache = {
  generatedAt: 0,
  body: '',
  etag: '',
  lastModified: ''
}

const xmlEscapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&apos;'
}
const xmlEscapeRegex = /[&<>"']/g

const escapeXml = (value) => _.toString(value).replace(xmlEscapeRegex, chr => xmlEscapeMap[chr])

const buildPageUrl = (page) => {
  if (WIKI.config.lang.namespacing) {
    return `/${page.localeCode}/${page.path}`
  }
  if (page.path === 'home') {
    return '/'
  }
  return `/${page.path}`
}

const getSitemapIgnoreTargets = async () => {
  const targets = []
  const storageTargets = _.get(WIKI, 'models.storage.targets', [])

  for (const target of storageTargets) {
    if (target.key === 'git') {
      const repoPath = path.resolve(WIKI.ROOTPATH, _.get(target, 'config.localRepoPath', path.join(WIKI.config.dataPath, 'repo')))
      targets.push({
        key: 'git',
        repoPath,
        alwaysNamespace: _.get(target, 'config.alwaysNamespace', false)
      })
    } else if (target.key === 'disk') {
      const repoPath = path.resolve(WIKI.ROOTPATH, _.get(target, 'config.path', ''))
      targets.push({
        key: 'disk',
        repoPath
      })
    }
  }

  if (!targets.some(t => t.key === 'git')) {
    targets.push({
      key: 'git',
      repoPath: path.resolve(WIKI.ROOTPATH, WIKI.config.dataPath, 'repo'),
      alwaysNamespace: false
    })
  }

  const uniqueTargets = _.uniqBy(targets.filter(t => !_.isEmpty(t.repoPath)), t => `${t.key}:${t.repoPath}`)
  const resolvedTargets = []
  for (const target of uniqueTargets) {
    const ignoreFilePath = path.join(target.repoPath, '.wikijsignore')
    if (!(await fs.pathExists(ignoreFilePath))) {
      continue
    }
    const checker = await ignoreHelper.getIgnoreChecker(target.repoPath)
    resolvedTargets.push({
      ...target,
      checker
    })
  }

  return resolvedTargets
}

const buildIgnorePathsForPage = (page, target) => {
  const fileName = `${page.path}.${pageHelper.getFileExtension(page.contentType)}`
  if (target.key === 'git') {
    if (target.alwaysNamespace || (WIKI.config.lang.namespacing && WIKI.config.lang.code !== page.localeCode)) {
      return [`${page.localeCode}/${fileName}`]
    }
    return [fileName]
  }
  if (target.key === 'disk') {
    if (WIKI.config.lang.code !== page.localeCode) {
      return [`${page.localeCode}/${fileName}`]
    }
    return [fileName]
  }
  return [fileName]
}

const isPageIgnoredForSitemap = (page, ignoreTargets) => {
  if (!ignoreTargets || ignoreTargets.length < 1) return false
  return ignoreTargets.some(target => {
    const relPaths = buildIgnorePathsForPage(page, target)
    return relPaths.some(relPath => ignoreHelper.matches(target.checker, relPath))
  })
}

/**
 * Robots.txt
 */
router.get('/robots.txt', (req, res, next) => {
  res.type('text/plain')
  if (_.includes(WIKI.config.seo.robots, 'noindex')) {
    res.send('User-agent: *\nDisallow: /')
  } else {
    const host = _.trimEnd(WIKI.config.host, '/')
    res.send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /login',
      'Disallow: /login/',
      'Disallow: /logout',
      'Disallow: /register',
      'Disallow: /signup',
      'Disallow: /verify/',
      'Disallow: /login-reset/',
      'Disallow: /graphql',
      'Disallow: /_api/',
      'Disallow: /_og/',
      'Disallow: /ph/',
      'Disallow: /t/',
      '',
      `Sitemap: ${host}/sitemap.xml`
    ].join('\n'))
  }
})

/**
 * Sitemap.xml
 */
router.get('/sitemap.xml', async (req, res, next) => {
  try {
    const hostBase = _.trimEnd(WIKI.config.host, '/')
    const nowTs = Date.now()
    if (nowTs - sitemapCache.generatedAt > sitemapCacheTTL || !sitemapCache.body) {
      const guestUser = (WIKI.auth.guest && WIKI.auth.guest.id === 2) ?
        WIKI.auth.guest :
        await WIKI.models.users.getGuestUser()

      const pages = await WIKI.models.pages.query()
        .column([
          'pages.path',
          'pages.contentType',
          'pages.localeCode',
          'pages.isPublished',
          'pages.isPrivate',
          'pages.publishStartDate',
          'pages.publishEndDate',
          'pages.updatedAt'
        ])
        .withGraphFetched('tags')
        .modifyGraph('tags', builder => {
          builder.select('tag')
        })
        .where({
          'pages.isPrivate': false,
          'pages.isPublished': true
        })
        .orderBy('pages.updatedAt', 'desc')

      const now = moment()
      const ignoreTargets = await getSitemapIgnoreTargets()
      const entries = pages
        .filter(page => {
          if (!_.isEmpty(page.publishStartDate) && moment(page.publishStartDate).isAfter(now)) {
            return false
          }
          if (!_.isEmpty(page.publishEndDate) && moment(page.publishEndDate).isBefore(now)) {
            return false
          }
          if (isPageIgnoredForSitemap(page, ignoreTargets)) {
            return false
          }
          return WIKI.auth.checkAccess(guestUser, ['read:pages'], {
            locale: page.localeCode,
            path: page.path,
            tags: _.get(page, 'tags', [])
          })
        })
        .map(page => {
          const loc = `${hostBase}${buildPageUrl(page)}`
          const lastmod = moment(page.updatedAt).isValid() ? moment(page.updatedAt).toISOString() : null
          return { loc, lastmod }
        })

      if (!WIKI.config.lang.namespacing && !entries.some(e => e.loc === `${hostBase}/`)) {
        const canReadHome = WIKI.auth.checkAccess(guestUser, ['read:pages'], {
          locale: WIKI.config.lang.code,
          path: 'home',
          tags: []
        })
        if (canReadHome) {
          entries.push({
            loc: `${hostBase}/`,
            lastmod: null
          })
        }
      }

      const body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries
          .sort((a, b) => a.loc.localeCompare(b.loc))
          .map(entry => [
            '<url>',
            `<loc>${escapeXml(entry.loc)}</loc>`,
            entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '',
            '</url>'
          ].filter(Boolean).join('')),
        '</urlset>'
      ].join('\n')

      sitemapCache.generatedAt = nowTs
      sitemapCache.body = body
      sitemapCache.etag = crypto.createHash('sha1').update(body).digest('hex')
      sitemapCache.lastModified = _.chain(entries).map('lastmod').compact().max().value() || moment().toISOString()
    }

    res.set('Cache-Control', 'public, max-age=0, must-revalidate')
    res.set('ETag', `"${sitemapCache.etag}"`)
    res.set('Last-Modified', new Date(sitemapCache.lastModified).toUTCString())
    res.type('application/xml')

    if (req.fresh) {
      return res.status(304).end()
    }

    res.status(200).send(sitemapCache.body)
  } catch (err) {
    next(err)
  }
})

/**
 * Health Endpoint
 */
router.get('/healthz', (req, res, next) => {
  if (WIKI.models.knex.client.pool.numFree() < 1 && WIKI.models.knex.client.pool.numUsed() < 1) {
    res.status(503).json({ ok: false }).end()
  } else {
    res.status(200).json({ ok: true }).end()
  }
})

/**
 * Administration
 */
router.get(['/a', '/a/*'], (req, res, next) => {
  if (!WIKI.auth.checkAccess(req.user, [
    'manage:system',
    'write:users',
    'manage:users',
    'write:groups',
    'manage:groups',
    'manage:navigation',
    'manage:theme',
    'manage:api'
  ])) {
    _.set(res.locals, 'pageMeta.title', 'Unauthorized')
    return res.status(403).render('unauthorized', { action: 'view' })
  }

  _.set(res.locals, 'pageMeta.title', 'Admin')
  res.render('admin')
})

/**
 * Download Page / Version
 */
router.get(['/d', '/d/*'], async (req, res, next) => {
  const pageArgs = pageHelper.parsePath(req.path, { stripExt: true })

  const versionId = (req.query.v) ? _.toSafeInteger(req.query.v) : 0

  const page = await WIKI.models.pages.getPageFromDb({
    path: pageArgs.path,
    locale: pageArgs.locale,
    userId: req.user.id,
    isPrivate: false
  })

  pageArgs.tags = _.get(page, 'tags', [])

  if (versionId > 0) {
    if (!WIKI.auth.checkAccess(req.user, ['read:history'], pageArgs)) {
      _.set(res.locals, 'pageMeta.title', 'Unauthorized')
      return res.status(403).render('unauthorized', { action: 'downloadVersion' })
    }
  } else {
    if (!WIKI.auth.checkAccess(req.user, ['read:source'], pageArgs)) {
      _.set(res.locals, 'pageMeta.title', 'Unauthorized')
      return res.status(403).render('unauthorized', { action: 'download' })
    }
  }

  if (page) {
    const fileName = _.last(page.path.split('/')) + '.' + pageHelper.getFileExtension(page.contentType)
    res.attachment(fileName)
    if (versionId > 0) {
      const pageVersion = await WIKI.models.pageHistory.getVersion({ pageId: page.id, versionId })
      res.send(pageHelper.injectPageMetadata(pageVersion))
    } else {
      res.send(pageHelper.injectPageMetadata(page))
    }
  } else {
    res.status(404).end()
  }
})

/**
 * Create/Edit document
 */
router.get(['/e', '/e/*'], async (req, res, next) => {
  const pageArgs = pageHelper.parsePath(req.path, { stripExt: true })

  if (WIKI.config.lang.namespacing && !pageArgs.explicitLocale) {
    return res.redirect(`/e/${pageArgs.locale}/${pageArgs.path}`)
  }

  req.i18n.changeLanguage(pageArgs.locale)

  // -> Set Editor Lang
  _.set(res, 'locals.siteConfig.lang', pageArgs.locale)
  _.set(res, 'locals.siteConfig.rtl', req.i18n.dir() === 'rtl')

  // -> Check for reserved path
  if (pageHelper.isReservedPath(pageArgs.path)) {
    return next(new Error('Cannot create this page because it starts with a system reserved path.'))
  }

  // -> Get page data from DB
  let page = await WIKI.models.pages.getPageFromDb({
    path: pageArgs.path,
    locale: pageArgs.locale,
    userId: req.user.id,
    isPrivate: false
  })

  pageArgs.tags = _.get(page, 'tags', [])

  // -> Effective Permissions
  const effectivePermissions = WIKI.auth.getEffectivePermissions(req, pageArgs, page)

  const injectCode = {
    css: WIKI.config.theming.injectCSS,
    head: WIKI.config.theming.injectHead,
    body: WIKI.config.theming.injectBody
  }

  if (page) {
    // -> EDIT MODE
    if (!(effectivePermissions.pages.write || effectivePermissions.pages.manage)) {
      _.set(res.locals, 'pageMeta.title', 'Unauthorized')
      return res.status(403).render('unauthorized', { action: 'edit' })
    }

    // -> Get page tags
    await page.$relatedQuery('tags')
    page.tags = _.map(page.tags, 'tag')

    // Handle missing extra field
    page.extra = page.extra || { css: '', js: '' }
    page.extra.comments = _.get(page.extra, 'comments', true)
    page.extra.toc = _.get(page.extra, 'toc', true)
    page.extra.tags = _.get(page.extra, 'tags', true)
    page.extra.history = _.get(page.extra, 'history', true)

    // -> Beautify Script CSS
    if (!_.isEmpty(page.extra.css)) {
      page.extra.css = new CleanCSS({ format: 'beautify' }).minify(page.extra.css).styles
    }

    _.set(res.locals, 'pageMeta.title', `Edit ${page.title}`)
    _.set(res.locals, 'pageMeta.description', page.description)
    page.mode = 'update'
    page.isPublished = (page.isPublished === true || page.isPublished === 1) ? 'true' : 'false'
    page.content = Buffer.from(page.content).toString('base64')
  } else {
    // -> CREATE MODE
    if (!effectivePermissions.pages.write) {
      _.set(res.locals, 'pageMeta.title', 'Unauthorized')
      return res.status(403).render('unauthorized', { action: 'create' })
    }

    _.set(res.locals, 'pageMeta.title', `New Page`)
    page = {
      path: pageArgs.path,
      localeCode: pageArgs.locale,
      editorKey: null,
      mode: 'create',
      content: null,
      title: null,
      description: null,
      updatedAt: new Date().toISOString(),
      extra: {
        css: '',
        js: '',
        comments: true,
        toc: true,
        tags: true,
        history: true
      }
    }

    // -> From Template
    if (req.query.from && tmplCreateRegex.test(req.query.from)) {
      let tmplPageId = 0
      let tmplVersionId = 0
      if (req.query.from.indexOf(',')) {
        const q = req.query.from.split(',')
        tmplPageId = _.toSafeInteger(q[0])
        tmplVersionId = _.toSafeInteger(q[1])
      } else {
        tmplPageId = _.toSafeInteger(req.query.from)
      }

      if (tmplVersionId > 0) {
        // -> From Page Version
        const pageVersion = await WIKI.models.pageHistory.getVersion({ pageId: tmplPageId, versionId: tmplVersionId })
        if (!pageVersion) {
          _.set(res.locals, 'pageMeta.title', 'Page Not Found')
          return res.status(404).render('notfound', { action: 'template' })
        }
        if (!WIKI.auth.checkAccess(req.user, ['read:history'], { path: pageVersion.path, locale: pageVersion.locale })) {
          _.set(res.locals, 'pageMeta.title', 'Unauthorized')
          return res.status(403).render('unauthorized', { action: 'sourceVersion' })
        }
        page.content = Buffer.from(pageVersion.content).toString('base64')
        page.editorKey = pageVersion.editor
        page.title = pageVersion.title
        page.description = pageVersion.description
      } else {
        // -> From Page Live
        const pageOriginal = await WIKI.models.pages.query().findById(tmplPageId)
        if (!pageOriginal) {
          _.set(res.locals, 'pageMeta.title', 'Page Not Found')
          return res.status(404).render('notfound', { action: 'template' })
        }
        if (!WIKI.auth.checkAccess(req.user, ['read:source'], { path: pageOriginal.path, locale: pageOriginal.locale })) {
          _.set(res.locals, 'pageMeta.title', 'Unauthorized')
          return res.status(403).render('unauthorized', { action: 'source' })
        }
        page.content = Buffer.from(pageOriginal.content).toString('base64')
        page.editorKey = pageOriginal.editorKey
        page.title = pageOriginal.title
        page.description = pageOriginal.description
      }
    }
  }

  res.render('editor', { page, injectCode, effectivePermissions })
})

/**
 * History
 */
router.get(['/h', '/h/*'], async (req, res, next) => {
  const pageArgs = pageHelper.parsePath(req.path, { stripExt: true })

  if (WIKI.config.lang.namespacing && !pageArgs.explicitLocale) {
    return res.redirect(`/h/${pageArgs.locale}/${pageArgs.path}`)
  }

  req.i18n.changeLanguage(pageArgs.locale)

  _.set(res, 'locals.siteConfig.lang', pageArgs.locale)
  _.set(res, 'locals.siteConfig.rtl', req.i18n.dir() === 'rtl')

  const page = await WIKI.models.pages.getPageFromDb({
    path: pageArgs.path,
    locale: pageArgs.locale,
    userId: req.user.id,
    isPrivate: false
  })

  if (!page) {
    _.set(res.locals, 'pageMeta.title', 'Page Not Found')
    return res.status(404).render('notfound', { action: 'history' })
  }

  pageArgs.tags = _.get(page, 'tags', [])

  const effectivePermissions = WIKI.auth.getEffectivePermissions(req, pageArgs, page)

  if (!effectivePermissions.history.read) {
    _.set(res.locals, 'pageMeta.title', 'Unauthorized')
    return res.render('unauthorized', { action: 'history' })
  }

  if (page) {
    _.set(res.locals, 'pageMeta.title', page.title)
    _.set(res.locals, 'pageMeta.description', page.description)

    res.render('history', { page, effectivePermissions })
  } else {
    res.redirect(`/${pageArgs.path}`)
  }
})

/**
 * Page ID redirection
 */
router.get(['/i', '/i/:id'], async (req, res, next) => {
  const pageId = _.toSafeInteger(req.params.id)
  if (pageId <= 0) {
    return res.redirect('/')
  }

  const page = await WIKI.models.pages.query().column(['path', 'localeCode', 'isPrivate', 'privateNS']).findById(pageId)
  if (!page) {
    _.set(res.locals, 'pageMeta.title', 'Page Not Found')
    return res.status(404).render('notfound', { action: 'view' })
  }

  if (!WIKI.auth.checkAccess(req.user, ['read:pages'], {
    locale: page.localeCode,
    path: page.path,
    private: page.isPrivate,
    privateNS: page.privateNS,
    explicitLocale: false,
    tags: page.tags
  })) {
    _.set(res.locals, 'pageMeta.title', 'Unauthorized')
    return res.status(403).render('unauthorized', { action: 'view' })
  }

  if (WIKI.config.lang.namespacing) {
    return res.redirect(`/${page.localeCode}/${page.path}`)
  } else {
    return res.redirect(`/${page.path}`)
  }
})

/**
 * Profile
 */
router.get(['/p', '/p/*'], (req, res, next) => {
  if (!req.user || req.user.id < 1 || req.user.id === 2) {
    return res.status(403).render('unauthorized', { action: 'view' })
  }

  _.set(res.locals, 'pageMeta.title', 'User Profile')
  res.render('profile')
})

/**
 * Source
 */
router.get(['/s', '/s/*'], async (req, res, next) => {
  const pageArgs = pageHelper.parsePath(req.path, { stripExt: true })
  const versionId = (req.query.v) ? _.toSafeInteger(req.query.v) : 0

  const page = await WIKI.models.pages.getPageFromDb({
    path: pageArgs.path,
    locale: pageArgs.locale,
    userId: req.user.id,
    isPrivate: false
  })

  pageArgs.tags = _.get(page, 'tags', [])

  if (WIKI.config.lang.namespacing && !pageArgs.explicitLocale) {
    return res.redirect(`/s/${pageArgs.locale}/${pageArgs.path}`)
  }

  // -> Effective Permissions
  const effectivePermissions = WIKI.auth.getEffectivePermissions(req, pageArgs, page)

  _.set(res, 'locals.siteConfig.lang', pageArgs.locale)
  _.set(res, 'locals.siteConfig.rtl', req.i18n.dir() === 'rtl')

  if (versionId > 0) {
    if (!effectivePermissions.history.read) {
      _.set(res.locals, 'pageMeta.title', 'Unauthorized')
      return res.status(403).render('unauthorized', { action: 'sourceVersion' })
    }
  } else {
    if (!effectivePermissions.source.read) {
      _.set(res.locals, 'pageMeta.title', 'Unauthorized')
      return res.status(403).render('unauthorized', { action: 'source' })
    }
  }

  if (page) {
    if (versionId > 0) {
      const pageVersion = await WIKI.models.pageHistory.getVersion({ pageId: page.id, versionId })
      _.set(res.locals, 'pageMeta.title', pageVersion.title)
      _.set(res.locals, 'pageMeta.description', pageVersion.description)
      res.render('source', {
        page: {
          ...page,
          ...pageVersion
        },
        effectivePermissions
      })
    } else {
      _.set(res.locals, 'pageMeta.title', page.title)
      _.set(res.locals, 'pageMeta.description', page.description)

      res.render('source', { page, effectivePermissions })
    }
  } else {
    res.redirect(`/${pageArgs.path}`)
  }
})

/**
 * Tags
 */
router.get(['/t', '/t/*'], (req, res, next) => {
  _.set(res.locals, 'pageMeta.title', 'Tags')
  res.render('tags')
})

/**
 * User Avatar
 */
router.get('/_userav/:uid', async (req, res, next) => {
  if (!WIKI.auth.checkAccess(req.user, ['read:pages'])) {
    return res.sendStatus(403)
  }
  const av = await WIKI.models.users.getUserAvatarData(req.params.uid)
  if (av) {
    res.set('Content-Type', 'image/jpeg')
    res.send(av)
  }

  return res.sendStatus(404)
})

/**
 * View document / asset
 */
router.get('/*', async (req, res, next) => {
  const routeStart = process.hrtime.bigint()
  const serverTimingMetrics = []
  let serverTimingFinalized = false
  const timeStart = () => process.hrtime.bigint()
  const timeDurationMs = (start) => Number(process.hrtime.bigint() - start) / 1e6
  const addServerTiming = (name, start) => {
    serverTimingMetrics.push({
      name,
      dur: Math.max(0, Math.round(timeDurationMs(start) * 100) / 100)
    })
  }
  const finalizeServerTiming = () => {
    if (serverTimingFinalized || res.headersSent) return
    serverTimingFinalized = true
    serverTimingMetrics.push({
      name: 'total',
      dur: Math.max(0, Math.round(timeDurationMs(routeStart) * 100) / 100)
    })
    res.set('Server-Timing', serverTimingMetrics.map(metric => `${metric.name};dur=${metric.dur}`).join(', '))
  }
  const timeAsync = async (name, fn) => {
    const start = timeStart()
    const result = await fn()
    addServerTiming(name, start)
    return result
  }
  const renderWithServerTiming = async (view, locals) => {
    const renderStart = timeStart()
    const html = await new Promise((resolve, reject) => {
      res.render(view, locals, (err, out) => {
        if (err) return reject(err)
        resolve(out)
      })
    })
    addServerTiming('render', renderStart)
    finalizeServerTiming()
    res.send(html)
  }

  const stripExt = _.some(WIKI.config.pageExtensions, ext => _.endsWith(req.path, `.${ext}`))
  const pageArgs = pageHelper.parsePath(req.path, { stripExt })
  const isPage = (stripExt || pageArgs.path.indexOf('.') === -1)

  if (isPage) {
    if (WIKI.config.lang.namespacing && !pageArgs.explicitLocale) {
      const query = !_.isEmpty(req.query) ? `?${qs.stringify(req.query)}` : ''
      return res.redirect(`/${pageArgs.locale}/${pageArgs.path}${query}`)
    }

    req.i18n.changeLanguage(pageArgs.locale)

    try {
      // -> Get Page from cache
      const page = await timeAsync('get_page', () => WIKI.models.pages.getPage({
        path: pageArgs.path,
        locale: pageArgs.locale,
        userId: req.user.id,
        isPrivate: false
      }))
      pageArgs.tags = _.get(page, 'tags', [])

      // -> Effective Permissions
      const effectivePermissions = WIKI.auth.getEffectivePermissions(req, pageArgs, page)

      // -> Check User Access
      if (!effectivePermissions.pages.read) {
        if (req.user.id === 2) {
          res.cookie('loginRedirect', req.path, {
            maxAge: 15 * 60 * 1000
          })
        }
        if (pageArgs.path === 'home' && req.user.id === 2) {
          return res.redirect('/login')
        }
        _.set(res.locals, 'pageMeta.title', 'Unauthorized')
        return res.status(403).render('unauthorized', {
          action: 'view'
        })
      }

      _.set(res, 'locals.siteConfig.lang', pageArgs.locale)
      _.set(res, 'locals.siteConfig.rtl', req.i18n.dir() === 'rtl')

      if (page) {
        _.set(res.locals, 'pageMeta.title', page.title)
        _.set(res.locals, 'pageMeta.description', page.description)
        const rootOgImageUrl = _.trim(_.get(WIKI, 'config.seo.rootOgImageUrl', ''))
        _.set(
          res.locals,
          'pageMeta.image',
          (page.path === 'home' && rootOgImageUrl) ? rootOgImageUrl : WIKI.models.ogImage.getImageUrl(page)
        )

        // -> Check Publishing State
        let pageIsPublished = page.isPublished
        if (pageIsPublished && !_.isEmpty(page.publishStartDate)) {
          pageIsPublished = moment(page.publishStartDate).isSameOrBefore()
        }
        if (pageIsPublished && !_.isEmpty(page.publishEndDate)) {
          pageIsPublished = moment(page.publishEndDate).isSameOrAfter()
        }
        if (!pageIsPublished && !effectivePermissions.pages.write) {
          _.set(res.locals, 'pageMeta.title', 'Unauthorized')
          return res.status(403).render('unauthorized', {
            action: 'view'
          })
        }

        // -> Build breadcrumbs
        const breadcrumbPaths = []
        let currentBreadcrumbPath = ''
        for (const part of page.path.split('/')) {
          currentBreadcrumbPath = currentBreadcrumbPath ? `${currentBreadcrumbPath}/${part}` : part
          breadcrumbPaths.push(currentBreadcrumbPath)
        }
        const breadcrumbRows = await timeAsync('breadcrumbs_q', () => WIKI.models.knex.table('pageTree')
          .where('localeCode', page.localeCode)
          .whereIn('path', breadcrumbPaths)
          .select('path', 'title'))
        const breadcrumbTitles = _.fromPairs(breadcrumbRows.map(t => [t.path, t.title]))

        const breadcrumbs = [{ path: '/', name: 'Home' }]
        let currentPath = ''
        for (const part of page.path.split('/')) {
          currentPath = currentPath ? `${currentPath}/${part}` : part
          breadcrumbs.push({
            path: `/${page.localeCode}/${currentPath}`,
            name: breadcrumbTitles[currentPath] || part
          })
        }
        // Use the actual page title for the last segment if available
        if (page.title && page.title !== 'Untitled Page') {
          breadcrumbs[breadcrumbs.length - 1].name = page.title
        }

        // -> Build sidebar navigation
        let sdi = 1
        const sidebarTree = await timeAsync('nav_tree', () => WIKI.models.navigation.getTree({
          cache: true,
          locale: pageArgs.locale,
          groups: req.user.groups
        }))
        const sidebar = sidebarTree.map(n => ({
          i: `sdi-${sdi++}`,
          k: n.kind,
          l: n.label,
          c: n.icon,
          y: n.targetType,
          t: n.target
        }))

        // -> Build theme code injection
        const injectCode = {
          css: WIKI.config.theming.injectCSS,
          head: WIKI.config.theming.injectHead,
          body: WIKI.config.theming.injectBody
        }

        // Handle missing extra field
        page.extra = page.extra || { css: '', js: '' }
        page.extra.comments = _.get(page.extra, 'comments', true)
        page.extra.toc = _.get(page.extra, 'toc', true)
        page.extra.tags = _.get(page.extra, 'tags', true)
        page.extra.history = _.get(page.extra, 'history', true)

        if (!_.isEmpty(page.extra.css)) {
          injectCode.css = `${injectCode.css}\n${page.extra.css}`
        }

        if (!_.isEmpty(page.extra.js)) {
          injectCode.body = `${injectCode.body}\n${page.extra.js}`
        }

        // -> Anonymous view limiting
        let anonViewLimit = null
        if (WIKI.anonViewLimit && WIKI.anonViewLimit.isEnabled()) {
          anonViewLimit = await timeAsync('anon_limit', () => WIKI.anonViewLimit.evaluate(req, res, pageArgs, page))
          if (anonViewLimit && anonViewLimit.limitReached) {
            page.render = WIKI.anonViewLimit.truncateContent(page.render, anonViewLimit.truncatePercent)
            if (anonViewLimit.noIndex) {
              res.set('X-Robots-Tag', 'noindex, nofollow')
              _.set(res.locals, 'pageMeta.robots', 'noindex, nofollow')
            }
            res.cookie('loginRedirect', req.path, { maxAge: 15 * 60 * 1000 })
          } else if (anonViewLimit && anonViewLimit.softPrompt) {
            res.cookie('loginRedirect', req.path, { maxAge: 15 * 60 * 1000 })
          }
        }

        if (req.query.legacy || (req.get('user-agent') && req.get('user-agent').indexOf('Trident') >= 0)) {
          // -> Convert page TOC
          if (_.isString(page.toc)) {
            page.toc = JSON.parse(page.toc)
          }

          // -> Render legacy view
          return await renderWithServerTiming('legacy/page', {
            page,
            sidebar,
            injectCode,
            breadcrumbs,
            isAuthenticated: req.user && req.user.id !== 2,
            anonViewLimit
          })
        } else {
          // -> Convert page TOC
          if (!_.isString(page.toc)) {
            page.toc = JSON.stringify(page.toc)
          }

          // -> Inject comments variables
          const commentTmpl = {
            codeTemplate: WIKI.data.commentProvider.codeTemplate,
            providerKey: WIKI.data.commentProvider.key,
            head: WIKI.data.commentProvider.head,
            body: WIKI.data.commentProvider.body,
            main: WIKI.data.commentProvider.main
          }
          if (WIKI.config.features.featurePageComments && WIKI.data.commentProvider.codeTemplate) {
            [
              { key: 'pageUrl', value: `${WIKI.config.host}/i/${page.id}` },
              { key: 'pageId', value: page.id }
            ].forEach((cfg) => {
              commentTmpl.head = _.replace(commentTmpl.head, new RegExp(`{{${cfg.key}}}`, 'g'), cfg.value)
              commentTmpl.body = _.replace(commentTmpl.body, new RegExp(`{{${cfg.key}}}`, 'g'), cfg.value)
              commentTmpl.main = _.replace(commentTmpl.main, new RegExp(`{{${cfg.key}}}`, 'g'), cfg.value)
            })
          }

          // -> Page Filename (for edit on external repo button)
          let pageFilename = WIKI.config.lang.namespacing ? `${pageArgs.locale}/${page.path}` : page.path
          pageFilename += page.contentType === 'markdown' ? '.md' : '.html'

          // Skip membership resolution on the landing page to minimize render latency.
          let membershipInfo = {
            maxRows: 4,
            tierKey: 'free'
          }
          if (page.path !== 'home') {
            const effectiveTier = await timeAsync('membership', () => WIKI.models.membershipTiers.getEffectiveForUser(req.user))
            membershipInfo = {
              maxRows: effectiveTier ? effectiveTier.maxLongevidataRows : 4,
              tierKey: effectiveTier ? effectiveTier.key : 'free'
            }
          }

          // -> Render view
          return await renderWithServerTiming('page', {
            page,
            sidebar,
            injectCode,
            breadcrumbs,
            comments: commentTmpl,
            effectivePermissions,
            pageFilename,
            anonViewLimit,
            membershipInfo
          })
        }
      } else if (pageArgs.path === 'home') {
        _.set(res.locals, 'pageMeta.title', 'Welcome')
        const rootOgImageUrl = _.trim(_.get(WIKI, 'config.seo.rootOgImageUrl', ''))
        _.set(res.locals, 'pageMeta.image', rootOgImageUrl || WIKI.models.ogImage.getImageUrl({
          localeCode: pageArgs.locale,
          path: 'home'
        }))
        return await renderWithServerTiming('welcome', { locale: pageArgs.locale })
      } else {
        _.set(res.locals, 'pageMeta.title', 'Page Not Found')
        if (effectivePermissions.pages.write) {
          res.status(404).render('new', { path: pageArgs.path, locale: pageArgs.locale })
        } else {
          res.status(404).render('notfound', { action: 'view' })
        }
      }
    } catch (err) {
      next(err)
    }
  } else {
    if (!WIKI.auth.checkAccess(req.user, ['read:assets'], pageArgs)) {
      return res.sendStatus(403)
    }

    await WIKI.models.assets.getAsset(pageArgs.path, res)
  }
})

module.exports = router
