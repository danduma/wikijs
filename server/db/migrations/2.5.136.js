exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (!hasColumn) return

  await knex.schema.alterTable('comments', table => {
    table.index(['pagePath', 'createdAt'])
    table.index(['pageId'])
  })
}

exports.down = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (!hasColumn) return

  await knex.schema.alterTable('comments', table => {
    table.dropIndex(['pagePath', 'createdAt'])
    table.dropIndex(['pageId'])
  })
}

