/* global WIKI */

exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (!hasColumn) return

  // Knex/SQLite has limited ALTER COLUMN support; skip hardening at DB-level there.
  if (WIKI && WIKI.config && WIKI.config.db && WIKI.config.db.type === 'sqlite') {
    return
  }

  await knex.schema.alterTable('comments', table => {
    table.string('pagePath').notNullable().alter()
  })
}

exports.down = knex => { }

