const cheerio = require('cheerio')

const isWhitespaceText = (node) => {
  return node && node.type === 'text' && (!node.data || node.data.trim() === '')
}

const isTagWithClass = ($, node, className) => {
  return node && node.type === 'tag' && $(node).hasClass(className)
}

const removeClass = ($, node, className) => {
  if (node && node.type === 'tag') {
    $(node).removeClass(className)
  }
}

const detachNodes = ($, nodes) => {
  nodes.forEach(node => {
    $(node).remove()
  })
}

const isHeading = (node) => {
  return node && node.type === 'tag' && /^h[1-6]$/.test(node.name)
}

const extractTable = ($, node) => {
  if (!node || node.type !== 'tag') return null
  if (node.name === 'table') {
    return { table: node, container: null }
  }
  if (node.name === 'div' && $(node).hasClass('table-container')) {
    const table = $(node).find('table').first()
    if (table.length) {
      return { table: table[0], container: node }
    }
  }
  return null
}

const extractImage = ($, node) => {
  if (!node || node.type !== 'tag') return null
  if (node.name === 'img') return { image: node }
  const image = $(node).find('img').first()
  if (image.length) {
    return { image: image[0] }
  }
  return null
}

const cleanupEmptyParent = ($, node) => {
  if (!node || !node.parent || node.parent.type !== 'tag') return
  const parent = node.parent
  if (parent.name === 'p' && $(parent).children().length === 0 && $(parent).text().trim() === '') {
    $(parent).remove()
  }
}

const buildFaq = ($, sectionNode) => {
  if (!isHeading(sectionNode)) return
  const $section = $(sectionNode)
  const sectionLevel = getHeadingLevel(sectionNode)
  const marker = $('<span></span>')
  $section.before(marker)

  const nodes = []
  let cursor = sectionNode.nextSibling
  while (cursor) {
    if (isTagWithClass($, cursor, 'faq-section')) break
    if (isHeading(cursor) && getHeadingLevel(cursor) <= sectionLevel) break
    nodes.push(cursor)
    cursor = cursor.nextSibling
  }

  $section.remove()
  detachNodes($, nodes)

  const wrapper = $('<div class="faq"></div>')
  const header = $('<div class="faq-header"></div>')
  $section.removeClass('faq-section')
  header.append($section)
  wrapper.append(header)

  const introNodes = []
  let currentItem = null
  let currentContent = []

  const flushItem = () => {
    if (!currentItem) return
    const $item = $(currentItem)
    $item.find('.toc-anchor').remove()
    const summary = $('<summary class="fold-summary"></summary>')
    summary.html($item.html())
    const details = $('<details class="fold faq-item"></details>')
    const contentWrapper = $('<div class="fold-content faq-content"></div>')
    currentContent
      .filter(node => !isWhitespaceText(node))
      .forEach(node => {
        contentWrapper.append(node)
      })

    details.append(summary)
    details.append(contentWrapper)
    wrapper.append(details)

    currentItem = null
    currentContent = []
  }

  nodes.forEach(node => {
    if (isTagWithClass($, node, 'faq-item')) {
      flushItem()
      currentItem = node
    } else {
      if (currentItem) {
        currentContent.push(node)
      } else if (!isWhitespaceText(node)) {
        introNodes.push(node)
      }
    }
  })

  flushItem()

  introNodes.forEach(node => {
    wrapper.append(node)
  })

  marker.replaceWith(wrapper)
}

const buildQuickFacts = ($, headingNode) => {
  if (!isHeading(headingNode)) return
  const $heading = $(headingNode)
  const marker = $('<span></span>')
  $heading.before(marker)

  let tableNode = null
  let tableContainer = null
  let cursor = headingNode.nextSibling
  while (cursor) {
    if (isTagWithClass($, cursor, 'quick-facts')) break
    const tableInfo = extractTable($, cursor)
    if (tableInfo) {
      tableNode = tableInfo.table
      tableContainer = tableInfo.container
      break
    }
    cursor = cursor.nextSibling
  }

  if (!tableNode) {
    marker.remove()
    return
  }

  $heading.remove()
  if (tableContainer) $(tableContainer).remove()
  $(tableNode).remove()

  const wrapper = $('<div class="quick-facts"></div>')
  const header = $('<div class="quick-facts-header"></div>')
  $heading.removeClass('quick-facts')
  header.append($heading.contents())

  $(tableNode).addClass('infobox-table')
  wrapper.append(header)
  wrapper.append(tableNode)

  marker.replaceWith(wrapper)
}

const buildInfobox = ($, headingNode) => {
  if (!isHeading(headingNode)) return
  const $heading = $(headingNode)
  const marker = $('<span></span>')
  $heading.before(marker)

  const floatClass = $heading.hasClass('infobox-left') ? 'infobox-left'
    : $heading.hasClass('infobox-right') ? 'infobox-right'
      : ''

  let imageNode = null
  let tableNode = null
  let tableContainer = null
  let cursor = headingNode.nextSibling
  while (cursor) {
    if (isTagWithClass($, cursor, 'infobox')) break
    if (!imageNode) {
      const imageInfo = extractImage($, cursor)
      if (imageInfo) {
        imageNode = imageInfo.image
      }
    }
    if (!tableNode) {
      const tableInfo = extractTable($, cursor)
      if (tableInfo) {
        tableNode = tableInfo.table
        tableContainer = tableInfo.container
      }
    }
    cursor = cursor.nextSibling
  }

  if (!tableNode && !imageNode) {
    marker.remove()
    return
  }

  $heading.remove()
  if (imageNode) {
    $(imageNode).remove()
    cleanupEmptyParent($, imageNode)
  }
  if (tableContainer) $(tableContainer).remove()
  if (tableNode) $(tableNode).remove()

  const wrapper = $('<div></div>')
    .addClass('infobox')

  if (floatClass) wrapper.addClass(floatClass)

  const name = $('<div class="infobox-name"></div>')
  $heading.removeClass('infobox infobox-left infobox-right')
  name.append($heading.contents())
  wrapper.append(name)

  if (imageNode) {
    const imageContainer = $('<div class="infobox-image-container"></div>')
    const $image = $(imageNode)
    imageContainer.append($image)
    wrapper.append(imageContainer)

    const captionText = $image.attr('title')
    if (captionText) {
      wrapper.append($('<div class="infobox-image-caption"></div>').text(captionText))
    }
  }

  if (tableNode) {
    $(tableNode).addClass('infobox-table')
    wrapper.append(tableNode)
  }

  marker.replaceWith(wrapper)
}

const buildReferencesSection = ($, headingNode) => {
  if (!isHeading(headingNode)) return
  const $heading = $(headingNode)
  const headingLevel = getHeadingLevel(headingNode)
  const marker = $('<span></span>')
  $heading.before(marker)

  let footnotesNode = null
  let cursor = headingNode.nextSibling
  while (cursor) {
    if (isTagWithClass($, cursor, 'references-section')) break
    if (isHeading(cursor) && getHeadingLevel(cursor) <= headingLevel) break
    if (cursor.type === 'tag' && cursor.name === 'section' && $(cursor).hasClass('footnotes')) {
      footnotesNode = cursor
      break
    }
    cursor = cursor.nextSibling
  }

  if (!footnotesNode) {
    marker.remove()
    return
  }

  $heading.remove()
  $(footnotesNode).remove()

  const details = $('<details class="references"></details>')
  const summary = $('<summary class="references-title"></summary>')
  $heading.removeClass('references-section')
  summary.append($heading.contents())
  details.append(summary)
  details.append(footnotesNode)

  marker.replaceWith(details)
}

const getHeadingLevel = (node) => {
  if (!isHeading(node)) return null
  return parseInt(node.name.substring(1), 10)
}

const isFoldHeading = ($, node) => {
  return isHeading(node) && $(node).hasClass('fold')
}

const buildFoldGroup = ($, nodes, startIndex) => {
  const headingNode = nodes[startIndex]
  const level = getHeadingLevel(headingNode)
  if (!level) {
    return { node: headingNode, nextIndex: startIndex + 1 }
  }

  const $heading = $(headingNode)
  $heading.find('.toc-anchor').remove()
  $heading.removeClass('fold')

  const details = $('<details class="fold"></details>')
  details.addClass(`fold-level-${level}`)

  const summary = $('<summary class="fold-summary"></summary>')
  summary.append($heading.contents())
  details.append(summary)

  const contentWrapper = $('<div class="fold-content"></div>')

  let idx = startIndex + 1
  while (idx < nodes.length) {
    const node = nodes[idx]
    if (isHeading(node) && getHeadingLevel(node) <= level) break
    if (isFoldHeading($, node)) {
      const nested = buildFoldGroup($, nodes, idx)
      contentWrapper.append(nested.node)
      idx = nested.nextIndex
      continue
    }
    contentWrapper.append(node)
    idx += 1
  }

  details.append(contentWrapper)

  return { node: details, nextIndex: idx }
}

const buildFolds = ($) => {
  const nodes = $('body').contents().toArray()
  const output = []
  let idx = 0

  while (idx < nodes.length) {
    const node = nodes[idx]
    if (isFoldHeading($, node)) {
      const foldGroup = buildFoldGroup($, nodes, idx)
      output.push(foldGroup.node)
      idx = foldGroup.nextIndex
      continue
    }
    output.push(node)
    idx += 1
  }

  $('body').empty()
  output.forEach(node => {
    $('body').append(node)
  })
}

const transformCallouts = ($) => {
  $('.callout').each((idx, node) => {
    if (node.name !== 'blockquote') return
    const $node = $(node)
    const div = $('<div></div>')
    div.attr('class', $node.attr('class'))
    div.html($node.html())
    $node.replaceWith(div)
  })
}

const RISKY_HEADING_PATTERNS = [
  /\b(dosage|dosing|dose|protocol|protocols|regimen|stack|cycle|cycling|administration|how to take|usage)\b/i,
  /\b(dosificacion|dosificación|dosis|protocolo|protocolos|pauta|administracion|administración|como tomar|cómo tomar)\b/i
]

const getHeadingText = ($, headingNode) => {
  const cloned = $(headingNode).clone()
  cloned.find('.toc-anchor, .medical-disclaimer-pill').remove()
  return cloned.text().replace(/\s+/g, ' ').trim()
}

const isRiskyHeading = ($, headingNode) => {
  if (!isHeading(headingNode)) return false
  if (headingNode.name === 'h1') return false
  const headingText = getHeadingText($, headingNode)
  if (!headingText) return false
  return RISKY_HEADING_PATTERNS.some(pattern => pattern.test(headingText))
}

const buildMedicalDisclaimer = ($, headingNode) => {
  if (!isHeading(headingNode)) return
  const $heading = $(headingNode)
  if ($heading.find('.medical-disclaimer-pill').length > 0) return

  const pill = $('<button type="button" class="medical-disclaimer-pill">Medical disclaimer</button>')
  $heading.append(pill)
}

const attachMedicalDisclaimer = ($) => {
  const explicitMarkers = $('.medical-disclaimer').toArray()

  if (explicitMarkers.length > 0) {
    let targetHeading = null
    const firstMarker = explicitMarkers[0]

    if (isHeading(firstMarker)) {
      targetHeading = firstMarker
    } else {
      targetHeading = $(firstMarker).nextAll('h2, h3, h4, h5, h6').first()[0] || null
    }

    explicitMarkers.forEach(node => {
      if (isHeading(node)) {
        removeClass($, node, 'medical-disclaimer')
      } else {
        $(node).remove()
      }
    })

    if (!targetHeading) {
      targetHeading = $('h2, h3, h4, h5, h6').toArray().find(node => isRiskyHeading($, node)) || null
    }

    if (targetHeading) {
      buildMedicalDisclaimer($, targetHeading)
    }
    return
  }

  const firstRiskyHeading = $('h2, h3, h4, h5, h6')
    .toArray()
    .find(node => isRiskyHeading($, node))

  if (firstRiskyHeading) {
    buildMedicalDisclaimer($, firstRiskyHeading)
  }
}

module.exports = {
  init (input) {
    const $ = cheerio.load(input, { decodeEntities: true })

    attachMedicalDisclaimer($)

    $('.faq-section').each((idx, node) => {
      buildFaq($, node)
    })

    $('.references-section').each((idx, node) => {
      buildReferencesSection($, node)
    })

    buildFolds($)

    $('.quick-facts').each((idx, node) => {
      buildQuickFacts($, node)
    })

    $('.infobox').each((idx, node) => {
      buildInfobox($, node)
    })

    transformCallouts($)

    return $.html('body').replace('<body>', '').replace('</body>', '')
  }
}
