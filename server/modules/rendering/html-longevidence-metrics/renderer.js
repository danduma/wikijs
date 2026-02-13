const cheerio = require('cheerio')
const Base64 = require('js-base64').Base64
const EFFECT_CODE_RE = /^([udeq])([0-3])([pnx])$/i
const EFFECT_TEXT_RE = /^([↑↓]{1,3}|[=↔]|\?)\s*(?:\(([pnx])\))?$/i

const normalizeDirection = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (['increase', 'increased', 'up', 'higher'].includes(normalized)) return 'increase'
  if (['decrease', 'decreased', 'down', 'lower'].includes(normalized)) return 'decrease'
  if (['no_change', 'no change', 'neutral', 'flat', 'unchanged'].includes(normalized)) return 'no_change'
  return 'unclear'
}

const normalizeMagnitude = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (['none', 'zero', '0'].includes(normalized)) return 'none'
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
  if (magnitude === 'none') return 1
  return 1
}

const getEffectLabel = (payload) => {
  if (payload.label) return payload.label

  if (payload.direction === 'unclear') return 'Unclear'
  if (payload.direction === 'no_change') return 'No effect'

  let magnitudeLabel = null
  if (payload.magnitude === 'large') magnitudeLabel = 'Large'
  if (payload.magnitude === 'medium') magnitudeLabel = 'Medium'
  if (payload.magnitude === 'small') magnitudeLabel = 'Small'

  let sentimentLabel = 'Decrease'
  if (payload.direction === 'increase') sentimentLabel = 'Increase'
  if (payload.sentiment === 'positive') sentimentLabel = 'Improvement'
  if (payload.sentiment === 'negative') sentimentLabel = 'Worsening'

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
  let icon = '?'
  if (direction === 'increase') icon = '↑'
  if (direction === 'decrease') icon = '↓'
  if (direction === 'no_change') icon = '='
  return new Array(count).fill(icon).join('')
}

const decodeCompactEffectCode = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null

  if (normalized === '0') {
    return {
      direction: 'no_change',
      magnitude: 'none',
      sentiment: 'neutral'
    }
  }

  const match = normalized.match(EFFECT_CODE_RE)
  if (!match) return null

  const [, directionCode, magnitudeCode, sentimentCode] = match
  let direction = 'unclear'
  if (directionCode === 'u') direction = 'increase'
  if (directionCode === 'd') direction = 'decrease'
  if (directionCode === 'e') direction = 'no_change'

  let magnitude = 'none'
  if (magnitudeCode === '3') magnitude = 'large'
  if (magnitudeCode === '2') magnitude = 'medium'
  if (magnitudeCode === '1') magnitude = 'small'

  let sentiment = 'neutral'
  if (sentimentCode === 'p') sentiment = 'positive'
  if (sentimentCode === 'n') sentiment = 'negative'

  return { direction, magnitude, sentiment }
}

const encodeTextTokenAsEffectCode = (text) => {
  const normalized = String(text || '').trim()
  const match = normalized.match(EFFECT_TEXT_RE)
  if (!match) return null

  const symbol = match[1]
  const impact = (match[2] || 'x').toLowerCase()

  if (symbol === '?') return 'q0x'
  if (symbol === '=' || symbol === '↔') return `e0${impact}`

  const direction = symbol.includes('↑') ? 'u' : 'd'
  const magnitude = String(symbol.length)
  return `${direction}${magnitude}${impact}`
}

const upgradePlainTextTokens = ($) => {
  $('td, th, p, li').each((i, elm) => {
    const $elm = $(elm)
    if ($elm.find('effect, longevidence-effect').length) return

    const meaningfulChildren = $elm.contents().toArray().filter(node => {
      return !(node.type === 'text' && String(node.data || '').trim() === '')
    })

    if (meaningfulChildren.length !== 1) return

    const child = meaningfulChildren[0]
    if (child.type !== 'text') return

    const effectCode = encodeTextTokenAsEffectCode(String(child.data || '').trim())
    if (!effectCode) return

    $elm.html(`<effect e="${effectCode}"></effect>`)
  })
}

const buildEffectPayload = ($elm) => {
  const compact = decodeCompactEffectCode($elm.attr('e'))
  if (compact) {
    return {
      ...compact,
      label: $elm.attr('label') || ''
    }
  }

  return {
    direction: normalizeDirection($elm.attr('direction')),
    magnitude: normalizeMagnitude($elm.attr('magnitude')),
    sentiment: normalizeSentiment($elm.attr('sentiment')),
    label: $elm.attr('label') || ''
  }
}

module.exports = {
  init (input) {
    const $ = cheerio.load(input, { decodeEntities: true })
    upgradePlainTextTokens($)

    $('longevidence-effect, effect').each((i, elm) => {
      const $elm = $(elm)
      const payload = buildEffectPayload($elm)

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
