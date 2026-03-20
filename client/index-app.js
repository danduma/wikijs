require('core-js/stable')
require('regenerator-runtime/runtime')

/* global siteConfig */
/* eslint-disable no-unused-expressions */

switch (window.document.documentElement.lang) {
  case 'ar':
  case 'fa':
    import(/* webpackChunkName: "fonts-arabic" */ './scss/fonts/arabic.scss')
    break
  default:
    import(/* webpackChunkName: "fonts-default" */ './scss/fonts/default.scss')
    break
}

require('modernizr')

require('./scss/app.scss')
const getThemeKey = () => (siteConfig && siteConfig.theme) ? siteConfig.theme : 'default'
const importThemeScss = (themeKey) => import(/* webpackChunkName: "theme" */ './themes/' + themeKey + '/scss/app.scss')
const importThemeJs = (themeKey) => import(/* webpackChunkName: "theme" */ './themes/' + themeKey + '/js/app.js')
const scheduleNonCriticalTask = (task) => {
  const runTask = () => task()

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(runTask, { timeout: 2500 })
    return
  }

  if (document.readyState === 'complete') {
    window.setTimeout(runTask, 0)
  } else {
    window.addEventListener('load', () => {
      window.setTimeout(runTask, 0)
    }, { once: true })
  }
}

importThemeScss(getThemeKey()).catch(() => {
  if (getThemeKey() !== 'default') {
    siteConfig.theme = 'default'
    return importThemeScss('default')
  }
})

import(/* webpackChunkName: "mdi" */ '@mdi/font/css/materialdesignicons.css')

require('./helpers/compatibility.js')
require('./client-app.js')

scheduleNonCriticalTask(() => {
  importThemeJs(getThemeKey()).catch(() => {
    if (getThemeKey() !== 'default') {
      siteConfig.theme = 'default'
      return importThemeJs('default')
    }
  })
})
