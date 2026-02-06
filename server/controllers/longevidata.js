const express = require('express')
const rp = require('request-promise')
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
      tierKey: tier ? tier.key : 'free'
    })
  } catch (err) {
    WIKI.logger.warn(`Longevidata refresh failed: ${err.message}`)
    return res.status(500).json({ error: 'Failed to load longevidata outcomes' })
  }
})

module.exports = router
