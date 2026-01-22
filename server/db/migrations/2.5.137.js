/* global WIKI */

exports.up = async knex => {
  const hasComments = await knex.schema.hasTable('comments')
  if (!hasComments) return

  await knex.schema.alterTable('comments', table => {
    table.boolean('isResolved').notNullable().defaultTo(false)
    table.integer('resolvedBy').unsigned().nullable()
    table.string('resolvedAt').nullable()
    table.index(['pagePath', 'isResolved', 'createdAt'])
  })
}

exports.down = async knex => {
  const hasComments = await knex.schema.hasTable('comments')
  if (!hasComments) return

  await knex.schema.alterTable('comments', table => {
    table.dropIndex(['pagePath', 'isResolved', 'createdAt'])
    table.dropColumn('isResolved')
    table.dropColumn('resolvedBy')
    table.dropColumn('resolvedAt')
  })
}
