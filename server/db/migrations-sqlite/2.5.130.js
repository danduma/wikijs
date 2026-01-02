exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'selectedText')
  if (!hasColumn) {
    return knex.schema.alterTable('comments', table => {
      table.text('selectedText').nullable()
    })
  }
}

exports.down = knex => {
  return knex.schema.alterTable('comments', table => {
    table.dropColumn('selectedText')
  })
}