const crypto = require('crypto')
const cheerio = require('cheerio')
const _ = require('lodash')

const COMMENTABLE_SELECTOR = 'p, li, blockquote, pre, table, figure, h1, h2, h3, h4, h5, h6'
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6'

function normalizeText (text) {
  return _.trim(String(text || '').replace(/\s+/g, ' ').toLowerCase())
}

function shortHash (text) {
  return crypto.createHash('sha1').update(text).digest('hex').substring(0, 8)
}

function sectionSlug (text) {
  const slug = _.kebabCase(_.trim(text || ''))
  return slug || 'section'
}

function isCommentableTag (tag) {
  return ['p', 'li', 'blockquote', 'pre', 'table', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)
}

function collectBlocks ($) {
  const blocks = []
  let currentSection = 'intro'

  $(COMMENTABLE_SELECTOR).each((idx, el) => {
    const tag = (_.get(el, 'name', '') || '').toLowerCase()
    if (!tag) return

    if ($(el).is(HEADING_SELECTOR)) {
      const headingText = normalizeText($(el).text())
      if (headingText) currentSection = sectionSlug(headingText)
    }

    if (!isCommentableTag(tag)) return
    const text = normalizeText($(el).text())
    if (!text) return

    blocks.push({
      el,
      tag,
      text,
      section: currentSection
    })
  })

  return blocks
}

function makeBlockId ({ section, tag, text }) {
  return `${section}_${tag}_${shortHash(text)}`
}

function extractBlockIds (html) {
  if (!html || _.trim(html).length < 1) return []
  const $ = cheerio.load(html)
  return $(COMMENTABLE_SELECTOR).map((idx, el) => $(el).attr('data-block-id')).get().filter(Boolean)
}

function annotateHtmlWithBlockIds ({ html, useBlockIdsInOrder = [] }) {
  const $ = cheerio.load(html || '')
  const blocks = collectBlocks($)
  const seen = new Map()
  const blockIds = []
  let usedCanonicalOrder = false

  blocks.forEach((block, idx) => {
    let baseId = null
    const preferred = useBlockIdsInOrder[idx]
    if (preferred) {
      baseId = preferred
      usedCanonicalOrder = true
    } else {
      baseId = makeBlockId(block)
    }

    const nextCount = (seen.get(baseId) || 0) + 1
    seen.set(baseId, nextCount)
    const finalId = nextCount > 1 ? `${baseId}_${nextCount}` : baseId

    $(block.el).attr('data-block-id', finalId)
    blockIds.push(finalId)
  })

  return {
    html: $('body').length ? $('body').html() : $.root().html(),
    blockIds,
    usedCanonicalOrder
  }
}

module.exports = {
  COMMENTABLE_SELECTOR,
  extractBlockIds,
  annotateHtmlWithBlockIds
}
