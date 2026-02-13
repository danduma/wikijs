const Model = require('objection').Model
const fs = require('fs-extra')
const path = require('path')

/* global WIKI */

/**
 * Locales model
 */
module.exports = class Locale extends Model {
  static get tableName() { return 'locales' }
  static get idColumn() { return 'code' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: ['code', 'name'],

      properties: {
        code: {type: 'string'},
        isRTL: {type: 'boolean', default: false},
        name: {type: 'string'},
        nativeName: {type: 'string'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'},
        availability: {type: 'integer'}
      }
    }
  }

  static get jsonAttributes() {
    return ['strings']
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString()
  }
  $beforeInsert() {
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  static formatDisplayName(name, localeCode) {
    if (typeof name !== 'string' || name.length < 1) {
      return name
    }

    const leadingSpaces = (name.match(/^\s*/) || [''])[0]
    const trimmedName = name.slice(leadingSpaces.length)
    if (trimmedName.length < 1) {
      return name
    }

    const firstChar = Array.from(trimmedName)[0]
    let lowerFirst
    let upperFirst

    try {
      lowerFirst = firstChar.toLocaleLowerCase(localeCode)
      upperFirst = firstChar.toLocaleUpperCase(localeCode)
    } catch (err) {
      lowerFirst = firstChar.toLocaleLowerCase()
      upperFirst = firstChar.toLocaleUpperCase()
    }

    // Only change values that are truly lowercase letters for that locale.
    if (lowerFirst === upperFirst || firstChar !== lowerFirst) {
      return name
    }

    return `${leadingSpaces}${upperFirst}${trimmedName.slice(firstChar.length)}`
  }

  static getFallbackDisplayName(localeCode) {
    const langCode = String(localeCode || '')
      .split(/[-_]/)[0]
      .toLowerCase()

    if (!langCode) {
      return localeCode
    }

    let displayName = ''

    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      try {
        displayName = new Intl.DisplayNames([localeCode], { type: 'language' }).of(langCode) || ''
      } catch (err) {
        displayName = ''
      }
      if (!displayName) {
        try {
          displayName = new Intl.DisplayNames(['en'], { type: 'language' }).of(langCode) || ''
        } catch (err) {
          displayName = ''
        }
      }
    }

    if (!displayName) {
      displayName = langCode
    }

    return this.formatDisplayName(displayName, localeCode)
  }

  static async getNavLocales({ cache = false } = {}) {
    if (!WIKI.config.lang.namespacing) {
      return []
    }

    if (cache) {
      const navLocalesCached = await WIKI.cache.get('nav:locales')
      if (navLocalesCached) {
        return navLocalesCached
      }
    }
    const navLocalesRaw = await WIKI.models.locales.query()
      .select('code', 'nativeName AS name')
      .whereIn('code', WIKI.config.lang.namespaces)
      .orderBy('code')
    const navLocalesFromDb = navLocalesRaw.map(locale => ({
      ...locale,
      name: this.formatDisplayName(locale.name, locale.code)
    }))
    const navLocalesByCode = new Set(navLocalesFromDb.map(locale => locale.code))
    const navLocalesFromLocalFiles = []

    for (const localeCode of WIKI.config.lang.namespaces) {
      if (navLocalesByCode.has(localeCode)) {
        continue
      }
      const localLocalePath = path.join(WIKI.SERVERPATH, `locales/${localeCode}.yml`)
      if (await fs.pathExists(localLocalePath)) {
        navLocalesFromLocalFiles.push({
          code: localeCode,
          name: this.getFallbackDisplayName(localeCode)
        })
      }
    }

    const navLocales = [...navLocalesFromDb, ...navLocalesFromLocalFiles]
      .sort((a, b) => a.code.localeCompare(b.code))
    if (navLocales) {
      if (cache) {
        await WIKI.cache.set('nav:locales', navLocales, 300)
      }
      return navLocales
    } else {
      WIKI.logger.warn('Site Locales for navigation are missing or corrupted.')
      return []
    }
  }
}
