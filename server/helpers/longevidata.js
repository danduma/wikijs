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
  return outcomes.slice(0, limit)
}

module.exports = {
  groupOutcomes,
  orderOutcomes,
  limitOutcomes
}
