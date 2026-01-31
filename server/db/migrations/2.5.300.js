/* global WIKI */

exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('rate_limits')
  if (hasTable) return

  await knex.schema.createTable('rate_limits', table => {
    table.string('key').primary()
    table.integer('points').notNullable()
    table.bigInteger('expire').nullable()
    table.index(['expire'])
  })
}

exports.down = async knex => {
  const hasTable = await knex.schema.hasTable('rate_limits')
  if (!hasTable) return

  await knex.schema.dropTable('rate_limits')
}
