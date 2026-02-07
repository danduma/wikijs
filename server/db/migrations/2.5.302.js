
exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('membership_tiers')
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('membership_tiers', 'lockedMessageKey')
    if (!hasColumn) {
      await knex.schema.alterTable('membership_tiers', table => {
        table.string('lockedMessageKey').nullable()
      })
    }
  }
}

exports.down = async knex => {
  const hasTable = await knex.schema.hasTable('membership_tiers')
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('membership_tiers', 'lockedMessageKey')
    if (hasColumn) {
      await knex.schema.alterTable('membership_tiers', table => {
        table.dropColumn('lockedMessageKey')
      })
    }
  }
}
