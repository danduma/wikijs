exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (!hasColumn) return

  await knex.raw(`
    UPDATE comments
    SET pagePath = (
      SELECT path FROM pages WHERE pages.id = comments.pageId
    )
    WHERE pageId IS NOT NULL
      AND (pagePath IS NULL OR pagePath = '')
  `)
}

exports.down = knex => { }
