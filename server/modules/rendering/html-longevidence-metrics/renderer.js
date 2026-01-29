const cheerio = require('cheerio')
const Base64 = require('js-base64').Base64

const normalizeDirection = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (['increase', 'increased', 'up', 'higher'].includes(normalized)) return 'increase'
  if (['decrease', 'decreased', 'down', 'lower'].includes(normalized)) return 'decrease'
  if (['no_change', 'no change', 'neutral', 'flat', 'unchanged'].includes(normalized)) return 'no_change'
  return 'unclear'
}

const normalizeMagnitude = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (['large', 'very_large', 'strong', 'substantial'].includes(normalized)) return 'large'
  if (['medium', 'moderate', 'normal'].includes(normalized)) return 'medium'
  if (['small', 'weak', 'minimal'].includes(normalized)) return 'small'
  return 'unclear'
}

const normalizeSentiment = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (['positive', 'beneficial', 'good'].includes(normalized)) return 'positive'
  if (['negative', 'harmful', 'bad'].includes(normalized)) return 'negative'
  if (['neutral', 'mixed', 'no_effect'].includes(normalized)) return 'neutral'
  return 'neutral'
}

const getArrowCount = (magnitude) => {
  if (magnitude === 'large') return 3
  if (magnitude === 'medium') return 2
  if (magnitude === 'small') return 1
  return 1
}

const getEffectLabel = (payload) => {
  if (payload.label) return payload.label

  const magnitudeLabel = payload.magnitude === 'large'
    ? 'Large'
    : payload.magnitude === 'medium'
      ? 'Medium'
      : payload.magnitude === 'small'
        ? 'Small'
        : null

  if (payload.sentiment === 'neutral') return 'No effect'

  const sentimentLabel = payload.sentiment === 'positive' ? 'Improvement' : 'Worsening'
  if (magnitudeLabel) return `${magnitudeLabel} ${sentimentLabel}`
  return sentimentLabel
}

const getScoreLabel = (payload) => {
  if (payload.label) return payload.label
  if (payload.value === 'very_weak') return 'Very weak'
  if (payload.value === 'weak') return 'Weak'
  if (payload.value === 'normal') return 'Normal'
  if (payload.value === 'strong') return 'Strong'
  return 'Score'
}

const buildArrowStack = (direction, count) => {
  const icon = direction === 'increase'
    ? '↑'
    : direction === 'decrease'
      ? '↓'
      : '–'
  return new Array(count).fill(icon).join('')
}

module.exports = {
  init (input) {
    const $ = cheerio.load(input, { decodeEntities: true })

    $('longevidence-effect').each((i, elm) => {
      const $elm = $(elm)
      const payload = {
        direction: normalizeDirection($elm.attr('direction')),
        magnitude: normalizeMagnitude($elm.attr('magnitude')),
        sentiment: normalizeSentiment($elm.attr('sentiment')),
        label: $elm.attr('label') || ''
      }

      $elm.attr('data-initial', Base64.encode(JSON.stringify(payload)))

      const arrowCount = getArrowCount(payload.magnitude)
      const label = getEffectLabel(payload)
      const arrows = buildArrowStack(payload.direction, arrowCount)
      const sentimentClass = `longevidence-effect-${payload.sentiment}`

      $elm.html(`
        <span class="longevidence-effect longevidence-effect-static ${sentimentClass}">
          <span class="longevidence-effect-arrows" aria-hidden="true">${arrows}</span>
          <span class="longevidence-effect-label">${label}</span>
        </span>
      `)
    })

    $('longevidence-score').each((i, elm) => {
      const $elm = $(elm)
      const payload = {
        value: String($elm.attr('value') || '').trim().toLowerCase(),
        label: $elm.attr('label') || ''
      }

      $elm.attr('data-initial', Base64.encode(JSON.stringify(payload)))

      const label = getScoreLabel(payload)
      const scoreClass = `longevidence-score-${payload.value || 'unknown'}`

      $elm.html(`
        <span class="longevidence-score longevidence-score-static ${scoreClass}">
          ${label}
        </span>
      `)
    })

    return $.html('body').replace('<body>', '').replace('</body>', '')
  }
}
