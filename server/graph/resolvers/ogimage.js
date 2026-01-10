const _ = require('lodash')
const graphHelper = require('../../helpers/graph')

/* global WIKI */

function normalizeBaseUrl(url) {
  const trimmed = _.trim(url || '')
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

module.exports = {
  Query: {
    async ogImage() { return {} }
  },
  Mutation: {
    async ogImage() { return {} }
  },
  OgImageQuery: {
    async config() {
      const og = _.get(WIKI, 'config.ogImage', {})
      return {
        enabled: _.get(og, 'enabled', false) === true,
        serviceBaseUrl: _.get(og, 'serviceBaseUrl', ''),
        defaultTemplate: _.get(og, 'defaultTemplate', 'default'),
        authMode: _.get(og, 'authMode', 'header'),
        sharedSecret: _.get(og, 'sharedSecret', ''),
        headerName: _.get(og, 'headerName', 'x-og-secret'),
        timeoutMs: _.toSafeInteger(_.get(og, 'timeoutMs', 5000)) || 5000
      }
    }
  },
  OgImageMutation: {
    async updateConfig(obj, args) {
      try {
        const current = _.get(WIKI, 'config.ogImage', {})

        const next = {
          enabled: _.has(args, 'enabled') ? (args.enabled === true) : _.get(current, 'enabled', false),
          serviceBaseUrl: _.has(args, 'serviceBaseUrl') ? normalizeBaseUrl(args.serviceBaseUrl) : _.get(current, 'serviceBaseUrl', ''),
          defaultTemplate: _.has(args, 'defaultTemplate') ? (_.trim(args.defaultTemplate) || 'default') : _.get(current, 'defaultTemplate', 'default'),
          authMode: _.has(args, 'authMode') ? (_.trim(args.authMode) || 'header') : _.get(current, 'authMode', 'header'),
          sharedSecret: _.has(args, 'sharedSecret') ? (_.defaultTo(args.sharedSecret, '')) : _.get(current, 'sharedSecret', ''),
          headerName: _.has(args, 'headerName') ? (_.trim(args.headerName) || 'x-og-secret') : _.get(current, 'headerName', 'x-og-secret'),
          timeoutMs: _.has(args, 'timeoutMs') ? (_.toSafeInteger(args.timeoutMs) || 5000) : (_.toSafeInteger(_.get(current, 'timeoutMs', 5000)) || 5000)
        }

        WIKI.config.ogImage = next
        await WIKI.configSvc.saveToDb(['ogImage'])

        return {
          responseResult: graphHelper.generateSuccess('OG image configuration updated successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
