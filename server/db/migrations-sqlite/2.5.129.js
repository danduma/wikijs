exports.up = knex => {
  return knex.schema
    .alterTable('comments', table => {
      table.text('selector').nullable()
    })
}

exports.down = knex => {
  return knex.schema
    .alterTable('comments', table => {
      table.dropColumn('selector')
    })
}