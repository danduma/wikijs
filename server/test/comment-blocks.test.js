const helper = require('../helpers/comment-blocks')

describe('Comment Block Anchors', () => {
  test('annotates commentable blocks with stable data-block-id values', () => {
    const input = `
      <h2>Mechanism of Action</h2>
      <p>Berberine activates AMPK in liver tissue.</p>
      <ul><li>Improves insulin sensitivity.</li></ul>
    `
    const result = helper.annotateHtmlWithBlockIds({ html: input })

    expect(result.blockIds.length).toBe(3)
    expect(result.blockIds[0]).toMatch(/^mechanism-of-action_h2_[a-f0-9]{8}$/)
    expect(result.blockIds[1]).toMatch(/^mechanism-of-action_p_[a-f0-9]{8}$/)
    expect(result.blockIds[2]).toMatch(/^mechanism-of-action_li_[a-f0-9]{8}$/)
    expect(result.html).toContain('data-block-id=')
  })

  test('uses canonical block order when provided', () => {
    const canonicalIds = ['intro_p_11111111', 'intro_p_22222222']
    const translated = '<p>Texto uno</p><p>Texto dos</p>'
    const result = helper.annotateHtmlWithBlockIds({
      html: translated,
      useBlockIdsInOrder: canonicalIds
    })

    expect(result.blockIds).toEqual(canonicalIds)
    expect(result.usedCanonicalOrder).toBe(true)
  })

  test('extracts existing data-block-id values in order', () => {
    const html = '<p data-block-id="a1"></p><p data-block-id="a2"></p>'
    expect(helper.extractBlockIds(html)).toEqual(['a1', 'a2'])
  })
})
