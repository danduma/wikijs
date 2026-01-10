exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (!hasColumn) return

  // Backfill from pages.path for existing rows that have pageId.
  //
  // Use a correlated subquery for broad DB compatibility (sqlite/postgres/mysql/mssql).
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

