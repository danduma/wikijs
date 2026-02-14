export function findSelectorElement (selector) {
  if (!selector) return null
  try {
    return document.querySelector(selector)
  } catch (err) {
    console.warn('Invalid selector:', selector, err)
    return null
  }
}

export function escapeAttrValue (value) {
  if (!value) return ''
  if (typeof window !== 'undefined' && window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value)
  }
  return String(value).replace(/["\\]/g, '\\$&')
}

export function findBlockElement (blockId) {
  if (!blockId) return null
  try {
    return document.querySelector(`[data-block-id="${escapeAttrValue(blockId)}"]`)
  } catch (err) {
    console.warn('Invalid blockId selector:', blockId, err)
    return null
  }
}

export function findCommentElement (comment) {
  if (!comment) return null
  if (comment.blockId) {
    const byBlock = findBlockElement(comment.blockId)
    if (byBlock) return byBlock
  }
  return findSelectorElement(comment.selector)
}

export function getElementLastRect (el) {
  if (!el) return null
  const rects = el.getClientRects()
  if (rects && rects.length > 0) {
    return rects[rects.length - 1]
  }
  return el.getBoundingClientRect()
}

export function getElementPagePositionFromElement (el) {
  const rect = getElementLastRect(el)
  if (!rect) return null
  const scrollX = window.scrollX || window.pageXOffset || 0
  const scrollY = window.scrollY || window.pageYOffset || 0
  return {
    top: rect.top + scrollY,
    right: rect.right + scrollX,
    left: rect.left + scrollX,
    bottom: rect.bottom + scrollY,
    width: rect.width,
    height: rect.height,
    rect
  }
}

export function getElementViewportPositionFromElement (el) {
  const rect = getElementLastRect(el)
  if (!rect) return null
  return {
    top: rect.top,
    right: rect.right,
    left: rect.left,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    rect
  }
}

export function getElementPagePosition (selector) {
  const el = findSelectorElement(selector)
  if (!el) return null
  return getElementPagePositionFromElement(el)
}

export function getElementViewportPosition (selector) {
  const el = findSelectorElement(selector)
  if (!el) return null
  return getElementViewportPositionFromElement(el)
}
