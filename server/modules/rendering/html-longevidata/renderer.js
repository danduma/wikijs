const cheerio = require('cheerio')
const rp = require('request-promise')
const Base64 = require('js-base64').Base64

module.exports = {
  init: async function (input, config) {
    const $ = cheerio.load(input)
    const widgets = $('longevidata-table')

    if (widgets.length === 0) {
      return input
    }

    const promises = []

    widgets.each((i, elm) => {
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
            renderStaticTable($, $elm, type, name, data)
          })
          .catch(err => {
            // Failure: Render error/empty state
            console.error(`LongeviData API Error for ${type} ${entityId}:`, err.message)
            renderErrorState($, $elm, name)
          })
      )
    })

    await Promise.all(promises)

    return $.html()
  }
}

// ----------------------------------------------------------------------------
// Static Rendering Helpers
// ----------------------------------------------------------------------------

function renderStaticTable($, $elm, type, name, data) {
  // 1. Set data-initial attribute
  const jsonStr = JSON.stringify(data)
  $elm.attr('data-initial', Base64.encode(jsonStr))

  // 2. Build HTML structure
  const $widget = $('<div class="longevidata-widget-static"></div>')
  
  // Header
  $widget.append(`
    <div class="longevidata-header">
      <h4>Examine Database: ${name}</h4>
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
  const groups = groupOutcomes(data.outcomes || [], type)

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
      $tbody.append(`
        <tr class="longevidata-outcome-row">
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

function renderErrorState($, $elm, name) {
  $elm.html(`
    <div class="longevidata-widget-error">
      <div class="longevidata-header">
        <h4>Examine Database: ${name}</h4>
      </div>
      <div style="padding: 20px; text-align: center; color: #666;">
        Unable to load research data. Please try again later.
      </div>
    </div>
  `)
}

// ----------------------------------------------------------------------------
// Data Helpers
// ----------------------------------------------------------------------------

function groupOutcomes(outcomes, type) {
  const groups = {}
  
  outcomes.forEach(outcome => {
    let groupKey = ''
    let groupName = ''
    
    // Assuming API response structure. Adjusting based on standard Examine/LongeviData patterns.
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
  
  return Object.values(groups).sort((a, b) => b.totalStudies - a.totalStudies)
}

function getGradeClass(grade) {
  const g = (grade || '').trim().toUpperCase()
  if (g === 'A') return 'longevidata-grade longevidata-grade-a'
  if (g === 'B') return 'longevidata-grade longevidata-grade-b'
  if (g === 'C') return 'longevidata-grade longevidata-grade-c'
  if (g === 'D') return 'longevidata-grade longevidata-grade-d'
  return 'longevidata-grade'
}

function getGradeLabel(grade) {
  return (grade || '?').toUpperCase()
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
