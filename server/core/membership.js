const _ = require('lodash')

const DEFAULT_PRESENTATION = {
  free: {
    displayPrice: 'Free',
    currency: 'USD',
    billingPeriod: 'forever',
    ctaText: 'Get Started',
    badgeText: ''
  },
  plus: {
    displayPrice: '$49',
    currency: 'USD',
    billingPeriod: 'year',
    ctaText: 'Upgrade',
    badgeText: ''
  },
  pro: {
    displayPrice: '$99',
    currency: 'USD',
    billingPeriod: 'year',
    ctaText: 'Upgrade',
    badgeText: 'Free until launch'
  }
}

function resolveRegion(ctx = {}) {
  const req = _.get(ctx, 'req')
  const headerRegion = req && (req.get('x-country-code') || req.get('x-region'))
  return (headerRegion || '').toUpperCase()
}

function getPresentationForTierKey(tierKey, ctx = {}) {
  const region = resolveRegion(ctx)
  const base = DEFAULT_PRESENTATION[tierKey] || DEFAULT_PRESENTATION.free

  if (region === 'EU') {
    if (tierKey === 'plus') return { ...base, displayPrice: '€49', currency: 'EUR' }
    if (tierKey === 'pro') return { ...base, displayPrice: '€99', currency: 'EUR' }
  }

  return base
}

function getPublicTierPresentation(tier, ctx = {}) {
  const key = _.get(tier, 'key', 'free')
  return getPresentationForTierKey(key, ctx)
}

function getTierPricing(tier, ctx = {}) {
  const key = _.get(tier, 'key', 'free')
  const region = resolveRegion(ctx)
  if (key === 'free') {
    return { amount: 0, currency: region === 'EU' ? 'EUR' : 'USD', billingPeriod: 'forever' }
  }
  if (key === 'plus') {
    return { amount: region === 'EU' ? 49 : 49, currency: region === 'EU' ? 'EUR' : 'USD', billingPeriod: 'year' }
  }
  if (key === 'pro') {
    return { amount: region === 'EU' ? 99 : 99, currency: region === 'EU' ? 'EUR' : 'USD', billingPeriod: 'year' }
  }
  return { amount: 0, currency: region === 'EU' ? 'EUR' : 'USD', billingPeriod: 'year' }
}

module.exports = {
  getPublicTierPresentation,
  getTierPricing
}
