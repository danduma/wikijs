const cheerio = require('cheerio')
const rp = require('request-promise')
const Base64 = require('js-base64').Base64
const longevidata = require('../../../helpers/longevidata')

/* global WIKI */

module.exports = {
  init: async function (input, config, context = {}) {
    const $ = cheerio.load(input)
    const outcomeWidgets = $('longevidata-table')
    const safetyWidgets = $('longevidata-safety')

    if (outcomeWidgets.length === 0 && safetyWidgets.length === 0) {
      return input
    }

    const pagePath = getNormalizedPagePath(context)
    if (!isWidgetPageAllowed(pagePath, config)) {
      outcomeWidgets.remove()
      safetyWidgets.remove()
      return $.html()
    }

    const promises = []
    let previewMaxRows = 4

    try {
      if (typeof WIKI !== 'undefined' && WIKI && WIKI.models && WIKI.models.membershipTiers) {
        const defaultTier = await WIKI.models.membershipTiers.getDefault()
        if (defaultTier && defaultTier.maxLongevidataRows !== undefined) {
          previewMaxRows = defaultTier.maxLongevidataRows
        }
      }
    } catch (err) {
      previewMaxRows = 4
    }

    outcomeWidgets.each((i, elm) => {
      const $elm = $(elm)
      const interventionId = $elm.attr('intervention')
      const conditionId = $elm.attr('condition')
      const biomarkerId = $elm.attr('biomarker')
      const name = $elm.attr('name') || 'Research Data'

      let type = 'intervention'
      let entityId = interventionId
      let apiParam = `intervention_id=${interventionId}`

      if (conditionId) {
        type = 'condition'
        entityId = conditionId
        apiParam = `condition_id=${conditionId}`
      } else if (biomarkerId) {
        type = 'biomarker'
        entityId = biomarkerId
        apiParam = `vocabulary_id=${biomarkerId}`
      }

      const options = {
        uri: `${config.apiBaseUrl}/api/research/outcomes?${apiParam}`,
        headers: {
          'Authorization': `Bearer ${config.apiToken}`
        },
        json: true,
        timeout: 5000 // 5s timeout to not block rendering too long
      }

      promises.push(
        rp(options)
          .then(data => {
            // Success: Render table
            renderStaticTable($, $elm, type, name, data, previewMaxRows)
          })
          .catch(err => {
            // Failure: Render error/empty state
            console.error(`LongeviData API Error for ${type} ${entityId}:`, err.message)
            renderErrorState($, $elm, name, err.message)
          })
      )
    })

    safetyWidgets.each((i, elm) => {
      const $elm = $(elm)
      const interventionId = $elm.attr('intervention')
      const conditionId = $elm.attr('condition')
      const name = $elm.attr('name') || 'Safety Information'

      if (!interventionId && !conditionId) {
        renderSafetyErrorState($, $elm, name, 'Missing intervention or condition id')
        return
      }

      const params = []
      if (interventionId) params.push(`intervention_id=${interventionId}`)
      if (conditionId) params.push(`condition_id=${conditionId}`)
      const queryString = params.join('&')

      const options = {
        uri: `${config.apiBaseUrl}/api/research/safety?${queryString}`,
        headers: {
          'Authorization': `Bearer ${config.apiToken}`
        },
        json: true,
        timeout: 5000
      }

      promises.push(
        rp(options)
          .then(data => {
            renderStaticSafetyTable($, $elm, name, data, previewMaxRows)
          })
          .catch(err => {
            console.error(`LongeviData Safety API Error for ${interventionId || conditionId}:`, err.message)
            renderSafetyErrorState($, $elm, name, err.message)
          })
      )
    })

    await Promise.all(promises)

    return $.html()
  },

  testConnection: async function (config) {
    if (!config.apiBaseUrl) {
      throw new Error('API Base URL is missing')
    }

    try {
      // Test request to verify connection and auth
      await rp({
        uri: `${config.apiBaseUrl}/api/research/outcomes?limit=1`,
        headers: {
          'Authorization': `Bearer ${config.apiToken}`
        },
        json: true,
        timeout: 5000
      })
      return `Connection verified: LongeviData API is reachable at ${config.apiBaseUrl}.`
    } catch (err) {
      if (err.statusCode === 401) {
        throw new Error('Authentication failed (401). Check your API Token.')
      } else if (err.statusCode === 404) {
        throw new Error('API endpoint not found (404). Check API Base URL.')
      } else {
        throw new Error(`Connection failed: ${err.message}`)
      }
    }
  }
}

function getNormalizedPagePath(context) {
  const rawPath = context && context.page && context.page.path
  if (!rawPath) return null
  return String(rawPath).trim().replace(/^\/+/, '').toLowerCase()
}

function getVisiblePaths(config) {
  const raw = (config && config.visiblePagePaths) || process.env.LONGEVIDATA_WIDGET_VISIBLE_PAGES || 'longevidata-test,es/longevidata-test'
  return String(raw)
    .split(',')
    .map(path => path.trim().replace(/^\/+/, '').toLowerCase())
    .filter(Boolean)
}

function isWidgetPageAllowed(pagePath, config) {
  if (!pagePath) return true
  const allowedPaths = getVisiblePaths(config)
  return allowedPaths.includes(pagePath)
}

// ----------------------------------------------------------------------------
// Static Rendering Helpers
// ----------------------------------------------------------------------------

function renderStaticTable($, $elm, type, name, data, previewMaxRows) {
  const rawOutcomes = Array.isArray(data) ? data : (data.outcomes || [])
  const orderedOutcomes = longevidata.orderOutcomes(rawOutcomes, type)
  const totalOutcomes = orderedOutcomes.length
  const previewOutcomes = longevidata.limitOutcomes(orderedOutcomes, previewMaxRows)

  // 1. Set data-initial attribute (preview only)
  const jsonStr = JSON.stringify({
    outcomes: previewOutcomes,
    totalOutcomes
  })
  $elm.attr('data-initial', Base64.encode(jsonStr))

  // 2. Build HTML structure
  const $widget = $('<div class="longevidata-widget-static"></div>')

  // Header
  $widget.append(`
    <div class="longevidata-header">
      <h4>LongeviData: ${name}</h4>
    </div>
  `)

  // Controls (Static/Disabled)
  $widget.append(`
    <div class="longevidata-controls">
      <input type="text" placeholder="Begin typing to filter database" disabled />
      <button class="longevidata-search-btn" disabled>
        <span class="mdi mdi-magnify"></span>
      </button>
    </div>
  `)

  // Toolbar (Static)
  $widget.append(`
    <div class="longevidata-toolbar">
      <label class="v-label theme--light">Show Conditions</label>
      <div class="v-input--selection-controls__input"><i aria-hidden="true" class="v-icon notranslate mdi mdi-toggle-switch-off theme--light"></i></div>
    </div>
  `)

  // Table
  const $table = $('<table class="longevidata-table"></table>')

  // Table Head
  let columns = []
  if (type === 'intervention') {
    columns = ['Health Condition/Goal', 'Health Outcome', 'Grade', 'Evidence', 'Effect']
  } else if (type === 'condition') {
    columns = ['Intervention', 'Health Outcome', 'Grade', 'Evidence', 'Effect']
  } else {
    columns = ['Intervention', 'Health Condition/Goal', 'Grade', 'Evidence', 'Effect']
  }

  const $thead = $('<thead><tr></tr></thead>')
  columns.forEach(col => {
    $thead.find('tr').append(`<th>${col}</th>`)
  })
  $table.append($thead)

  // Table Body
  const $tbody = $('<tbody></tbody>')

  // Group outcomes
  const groups = longevidata.groupOutcomes(previewOutcomes, type).sort((a, b) => b.totalStudies - a.totalStudies)
  let rowIndex = 0

  groups.forEach(group => {
    // Group Row
    $tbody.append(`
      <tr class="longevidata-group-row">
        <td>${group.name} <span class="mdi mdi-chevron-down"></span></td>
        <td>${group.outcomes.length} outcomes</td>
        <td></td>
        <td>${group.totalStudies} Studies</td>
        <td></td>
      </tr>
    `)

    // Outcome Rows (Hidden by default in static view or shown? Plan says "Expandable rows".
    // Usually static view shows collapsed or full. Let's show first few or collapsed?
    // Plan example shows "Expandable rows showing entity name".
    // The Client Side flow says "The static table is visible BEFORE Vue loads".
    // If we want it to look good, maybe we render them but hide them with CSS or just render the group rows.
    // The example HTML in plan shows outcome rows present.
    // Let's render them but maybe styling will hide them or they are visible.
    // For SEO/static content, visible is better. But visually it might be cluttered.
    // I'll render them.

    group.outcomes.forEach(outcome => {
      const dataIndex = rowIndex++
      $tbody.append(`
        <tr class="longevidata-outcome-row" data-row-index="${dataIndex}">
          <td></td>
          <td>${outcome.vocabulary_term || outcome.outcome_name}</td>
          <td><span class="${getGradeClass(outcome.grade_rating)}">${getGradeLabel(outcome.grade_rating)}</span></td>
          <td>${outcome.study_count} Studies · ${outcome.total_participants || 0} Participants</td>
          <td><span class="${getEffectClass(outcome.effect_direction)}">${getEffectLabel(outcome)}</span></td>
        </tr>
      `)
    })
  })

  if (groups.length === 0) {
    $tbody.append('<tr><td colspan="5" style="text-align:center; padding: 20px;">No outcomes found.</td></tr>')
  }

  $table.append($tbody)
  $widget.append($table)

  $elm.empty().append($widget)
}

function renderErrorState($, $elm, name, errorDetail) {
  $elm.html(`
    <div class="longevidata-widget-error">
      <div class="longevidata-header">
        <h4>LongeviData: ${name}</h4>
      </div>
      <div style="padding: 20px; text-align: center; color: #666;">
        Unable to load research data. Please try again later.
        ${errorDetail ? `<br><small style="color:red; margin-top: 10px; display:block;">${errorDetail}</small>` : ''}
      </div>
    </div>
  `)
}

function renderStaticSafetyTable($, $elm, name, data, previewMaxRows) {
  const rawSignals = Array.isArray(data) ? data : (data.signals || [])
  const orderedSignals = longevidata.orderSafetySignals(rawSignals)
  const totalSignals = orderedSignals.length
  const previewSignals = longevidata.limitSafetySignals(orderedSignals, previewMaxRows)

  const jsonStr = JSON.stringify({
    signals: previewSignals,
    totalSignals
  })
  $elm.attr('data-initial', Base64.encode(jsonStr))

  const $widget = $('<div class="longevidata-safety-widget-static"></div>')
  $widget.append(`
    <div class="longevidata-header">
      <h4>LongeviData Safety: ${name}</h4>
    </div>
  `)

  $widget.append(`
    <div class="longevidata-controls">
      <input type="text" placeholder="Filter safety data" disabled />
      <button class="longevidata-search-btn" disabled>
        <span class="mdi mdi-magnify"></span>
      </button>
    </div>
  `)

  const $table = $('<table class="longevidata-table"></table>')
  $table.append(`
    <thead>
      <tr>
        <th>Type</th>
        <th>Safety Signal</th>
        <th>Severity</th>
        <th>Evidence</th>
        <th>Reference</th>
      </tr>
    </thead>
  `)

  const $tbody = $('<tbody></tbody>')
  previewSignals.forEach(signal => {
    if (signal.isLocked) {
      $tbody.append(`
        <tr class="longevidata-outcome-row is-locked">
          <td><span class="mdi mdi-lock"></span></td>
          <td>Locked</td>
          <td><span class="mdi mdi-lock"></span></td>
          <td><span class="mdi mdi-lock"></span></td>
          <td><span class="mdi mdi-lock"></span></td>
        </tr>
      `)
      return
    }

    $tbody.append(`
      <tr class="longevidata-outcome-row">
        <td>${getSafetyTypeLabel(signal.signal_type)}</td>
        <td>${signal.title || '-'}</td>
        <td><span class="${getSafetySeverityClass(signal.severity)}">${getSafetySeverityLabel(signal.severity)}</span></td>
        <td>${getSafetyEvidenceLabel(signal.evidence_level)}</td>
        <td>${signal.reference_title || signal.reference_url || '-'}</td>
      </tr>
    `)
  })

  if (previewSignals.length === 0) {
    $tbody.append('<tr><td colspan="5" style="text-align:center; padding: 20px;">No safety signals found.</td></tr>')
  }

  $table.append($tbody)
  $widget.append($table)
  $elm.empty().append($widget)
}

function renderSafetyErrorState($, $elm, name, errorDetail) {
  $elm.html(`
    <div class="longevidata-widget-error">
      <div class="longevidata-header">
        <h4>LongeviData Safety: ${name}</h4>
      </div>
      <div style="padding: 20px; text-align: center; color: #666;">
        Unable to load safety data. Please try again later.
        ${errorDetail ? `<br><small style="color:red; margin-top: 10px; display:block;">${errorDetail}</small>` : ''}
      </div>
    </div>
  `)
}

// ----------------------------------------------------------------------------
// Data Helpers
// ----------------------------------------------------------------------------

function getGradeClass(grade) {
  const g = (grade || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (g === 'high' || g === 'strong' || g === 'a') return 'longevidata-grade longevidata-grade-high'
  if (g === 'moderate' || g === 'normal' || g === 'b') return 'longevidata-grade longevidata-grade-moderate'
  if (g === 'low' || g === 'weak' || g === 'c') return 'longevidata-grade longevidata-grade-low'
  if (g === 'very_low' || g === 'verylow' || g === 'very_weak' || g === 'd') return 'longevidata-grade longevidata-grade-very-low'
  return 'longevidata-grade'
}

function getGradeLabel(grade) {
  const g = (grade || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (g === 'high' || g === 'strong' || g === 'a') return 'High'
  if (g === 'moderate' || g === 'normal' || g === 'b') return 'Moderate'
  if (g === 'low' || g === 'weak' || g === 'c') return 'Low'
  if (g === 'very_low' || g === 'verylow' || g === 'very_weak' || g === 'd') return 'Very Low'
  return '?'
}

function getEffectClass(direction) {
  const d = (direction || '').toLowerCase()
  if (d.includes('pos') || d.includes('inc')) return 'longevidata-effect longevidata-effect-positive'
  if (d.includes('neg') || d.includes('dec')) return 'longevidata-effect longevidata-effect-negative'
  return 'longevidata-effect longevidata-effect-neutral'
}

function getEffectLabel(outcome) {
  // Combine magnitude and direction if available, or just direction
  // Example: "Large Improvement", "Minor Decrease"
  const mag = outcome.magnitude || ''
  const dir = outcome.effect_direction || ''
  if (mag && dir) return `${mag} ${dir}`
  return dir || 'No Effect'
}

function getSafetyTypeLabel(signalType) {
  const normalized = String(signalType || '').toLowerCase()
  const labels = {
    side_effect: 'Side effect',
    interaction: 'Interaction',
    contraindication: 'Contraindication',
    pregnancy: 'Pregnancy',
    lactation: 'Lactation',
    precaution: 'Precaution',
    wada: 'WADA',
    quality: 'Quality',
    other: 'Other'
  }
  return labels[normalized] || 'Other'
}

function getSafetySeverityLabel(severity) {
  const normalized = String(severity || '').toLowerCase()
  const labels = {
    mild: 'Mild',
    moderate: 'Moderate',
    severe: 'Severe',
    avoid: 'Avoid',
    unknown: 'Unknown'
  }
  return labels[normalized] || 'Unknown'
}

function getSafetySeverityClass(severity) {
  const normalized = String(severity || '').toLowerCase()
  if (normalized === 'avoid' || normalized === 'severe') return 'longevidata-grade longevidata-grade-low'
  if (normalized === 'moderate') return 'longevidata-grade longevidata-grade-moderate'
  if (normalized === 'mild') return 'longevidata-grade longevidata-grade-high'
  return 'longevidata-grade'
}

function getSafetyEvidenceLabel(level) {
  const normalized = String(level || '').toLowerCase()
  const labels = {
    high: 'High',
    moderate: 'Moderate',
    low: 'Low',
    very_low: 'Very low',
    case_report: 'Case report',
    theoretical: 'Theoretical',
    unknown: 'Unknown'
  }
  return labels[normalized] || 'Unknown'
}
