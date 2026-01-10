exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (!hasColumn) {
    await knex.schema.alterTable('comments', table => {
      table.string('pagePath').nullable()
      table.index(['pagePath'])
    })
  }
}

exports.down = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (hasColumn) {
    await knex.schema.alterTable('comments', table => {
      table.dropIndex(['pagePath'])
      table.dropColumn('pagePath')
    })
  }
}

