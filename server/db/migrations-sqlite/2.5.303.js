exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'blockId')
  if (hasColumn) return

  await knex.schema.alterTable('comments', table => {
    table.string('blockId').nullable()
    table.index(['pagePath', 'blockId'])
  })
}

exports.down = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'blockId')
  if (!hasColumn) return

  await knex.schema.alterTable('comments', table => {
    table.dropIndex(['pagePath', 'blockId'])
    table.dropColumn('blockId')
  })
}
