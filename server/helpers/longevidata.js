const _ = require('lodash')

function groupOutcomes(outcomes, type) {
  const groups = {}

  outcomes.forEach(outcome => {
    let groupKey = ''
    let groupName = ''

    if (type === 'intervention') {
      groupKey = outcome.condition_id || outcome.condition_name
      groupName = outcome.condition_name || 'Unknown Condition'
    } else {
      groupKey = outcome.intervention_id || outcome.intervention_name
      groupName = outcome.intervention_name || 'Unknown Intervention'
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        id: groupKey,
        name: groupName,
        outcomes: [],
        totalStudies: 0
      }
    }

    groups[groupKey].outcomes.push(outcome)
    groups[groupKey].totalStudies += (outcome.study_count || 0)
  })

  const grouped = Object.values(groups)
  grouped.forEach(group => {
    group.outcomes.sort((a, b) => {
      const aCount = a.study_count || 0
      const bCount = b.study_count || 0
      return aCount - bCount
    })
  })

  return grouped
}

function orderOutcomes(outcomes, type) {
  const grouped = groupOutcomes(outcomes, type)
  grouped.sort((a, b) => b.totalStudies - a.totalStudies)
  return _.flatMap(grouped, group => group.outcomes)
}

function limitOutcomes(outcomes, maxRows) {
  if (maxRows === null || maxRows === undefined) return outcomes
  const limit = Number(maxRows)
  if (!Number.isFinite(limit) || limit < 0) return outcomes
  
  // Return all outcomes, but mark those beyond limit as locked
  return outcomes.map((outcome, index) => {
    if (index < limit) {
      return outcome
    }
    // Redact locked outcomes
    return {
      ...outcome,
      isLocked: true,
      grade_rating: null,
      effect_direction: null,
      change_direction: null,
      change_magnitude: null,
      study_count: null,
      total_participants: null
    }
  })
}

function orderSafetySignals(signals) {
  const severityRank = {
    avoid: 5,
    severe: 4,
    moderate: 3,
    mild: 2,
    unknown: 1
  }
  const evidenceRank = {
    high: 6,
    moderate: 5,
    low: 4,
    very_low: 3,
    case_report: 2,
    theoretical: 1,
    unknown: 0
  }

  return _.orderBy(
    signals || [],
    [
      (signal) => severityRank[(signal && signal.severity) || 'unknown'] || 0,
      (signal) => evidenceRank[(signal && signal.evidence_level) || 'unknown'] || 0,
      'reviewed_at',
      'title'
    ],
    ['desc', 'desc', 'desc', 'asc']
  )
}

function limitSafetySignals(signals, maxRows) {
  if (maxRows === null || maxRows === undefined) return signals
  const limit = Number(maxRows)
  if (!Number.isFinite(limit) || limit < 0) return signals

  return (signals || []).map((signal, index) => {
    if (index < limit) {
      return signal
    }
    return {
      ...signal,
      isLocked: true,
      summary: null,
      severity: null,
      evidence_level: null,
      reference_url: null,
      reference_title: null,
      reviewed_at: null
    }
  })
}

module.exports = {
  groupOutcomes,
  orderOutcomes,
  limitOutcomes,
  orderSafetySignals,
  limitSafetySignals
}
