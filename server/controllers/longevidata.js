const express = require('express')
const rp = require('request-promise')
const { URLSearchParams } = require('url')
const longevidata = require('../helpers/longevidata')

/* global WIKI */

const router = express.Router()

router.get('/api/longevidata/outcomes', async (req, res) => {
  if (!WIKI.auth.checkAccess(req.user, ['read:pages'])) {
    return res.sendStatus(403)
  }

  const interventionId = req.query.intervention_id
  const conditionId = req.query.condition_id
  const biomarkerId = req.query.vocabulary_id

  let type = 'intervention'
  let apiParam = `intervention_id=${interventionId}`

  if (conditionId) {
    type = 'condition'
    apiParam = `condition_id=${conditionId}`
  } else if (biomarkerId) {
    type = 'biomarker'
    apiParam = `vocabulary_id=${biomarkerId}`
  }

  if (!interventionId && !conditionId && !biomarkerId) {
    return res.status(400).json({ error: 'Missing entity id' })
  }

  try {
    const renderer = await WIKI.models.renderers.query().where('key', 'htmlLongevidata').first()
    const cfg = renderer ? renderer.config : {}
    if (!cfg.apiBaseUrl) {
      return res.status(503).json({ error: 'Longevidata API not configured' })
    }

    const data = await rp({
      uri: `${cfg.apiBaseUrl}/api/research/outcomes?${apiParam}`,
      headers: {
        'Authorization': `Bearer ${cfg.apiToken}`
      },
      json: true,
      timeout: 10000
    })

    const rawOutcomes = Array.isArray(data) ? data : (data.outcomes || [])
    const orderedOutcomes = longevidata.orderOutcomes(rawOutcomes, type)
    const totalOutcomes = orderedOutcomes.length

    const tier = await WIKI.models.membershipTiers.getEffectiveForUser(req.user)
    const maxRows = tier ? tier.maxLongevidataRows : 4
    const limitedOutcomes = longevidata.limitOutcomes(orderedOutcomes, maxRows)

    return res.json({
      outcomes: limitedOutcomes,
      totalOutcomes,
      maxRows: maxRows === undefined ? null : maxRows,
      tierKey: tier ? tier.key : 'free',
      lockedMessageKey: tier ? tier.lockedMessageKey : null
    })
  } catch (err) {
    WIKI.logger.warn(`Longevidata refresh failed: ${err.message}`)
    return res.status(500).json({ error: 'Failed to load longevidata outcomes' })
  }
})

router.get('/api/longevidata/safety', async (req, res) => {
  if (!WIKI.auth.checkAccess(req.user, ['read:pages'])) {
    return res.sendStatus(403)
  }

  const interventionId = req.query.intervention_id
  const conditionId = req.query.condition_id
  const signalType = req.query.signal_type
  const severity = req.query.severity
  const evidenceLevel = req.query.evidence_level
  const search = req.query.q

  if (!interventionId && !conditionId) {
    return res.status(400).json({ error: 'Missing entity id' })
  }

  try {
    const renderer = await WIKI.models.renderers.query().where('key', 'htmlLongevidata').first()
    const cfg = renderer ? renderer.config : {}
    if (!cfg.apiBaseUrl) {
      return res.status(503).json({ error: 'Longevidata API not configured' })
    }

    const params = new URLSearchParams()
    if (interventionId) params.append('intervention_id', interventionId)
    if (conditionId) params.append('condition_id', conditionId)
    if (signalType) params.append('signal_type', signalType)
    if (severity) params.append('severity', severity)
    if (evidenceLevel) params.append('evidence_level', evidenceLevel)
    if (search) params.append('q', search)

    const data = await rp({
      uri: `${cfg.apiBaseUrl}/api/research/safety?${params.toString()}`,
      headers: {
        'Authorization': `Bearer ${cfg.apiToken}`
      },
      json: true,
      timeout: 10000
    })

    const rawSignals = Array.isArray(data) ? data : (data.signals || [])
    const orderedSignals = longevidata.orderSafetySignals(rawSignals)
    const totalSignals = orderedSignals.length

    const tier = await WIKI.models.membershipTiers.getEffectiveForUser(req.user)
    const maxRows = tier ? tier.maxLongevidataRows : 4
    const limitedSignals = longevidata.limitSafetySignals(orderedSignals, maxRows)

    return res.json({
      signals: limitedSignals,
      totalSignals,
      maxRows: maxRows === undefined ? null : maxRows,
      tierKey: tier ? tier.key : 'free',
      lockedMessageKey: tier ? tier.lockedMessageKey : null
    })
  } catch (err) {
    WIKI.logger.warn(`Longevidata safety refresh failed: ${err.message}`)
    return res.status(500).json({ error: 'Failed to load longevidata safety signals' })
  }
})

router.get('/api/research/snapshot/:topic', async (req, res) => {
  if (!WIKI.auth.checkAccess(req.user, ['read:pages'])) {
    return res.sendStatus(403)
  }

  const topic = req.params.topic
  if (!topic) {
    return res.status(400).json({ error: 'Missing topic' })
  }

  try {
    const renderer = await WIKI.models.renderers.query().where('key', 'htmlLongevidata').first()
    const cfg = renderer ? renderer.config : {}
    if (!cfg.apiBaseUrl) {
      return res.status(503).json({ error: 'Longevidata API not configured' })
    }

    const data = await rp({
      uri: `${cfg.apiBaseUrl}/api/research/snapshot/${encodeURIComponent(topic)}`,
      headers: {
        'Authorization': `Bearer ${cfg.apiToken}`
      },
      json: true,
      timeout: 5000
    })

    return res.json(data)
  } catch (err) {
    // If backend returns 404, propagate it
    if (err.statusCode === 404) {
      return res.status(404).json({ error: 'Topic not found' })
    }
    WIKI.logger.warn(`Research snapshot failed: ${err.message}`)
    return res.status(500).json({ error: 'Failed to load research snapshot' })
  }
})

module.exports = router
