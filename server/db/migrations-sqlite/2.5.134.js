exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (!hasColumn) return

  await knex('comments')
    .whereNull('pagePath')
    .orWhere('pagePath', '')
    .delete()
}

exports.down = knex => { }
