exports.up = async knex => {
  const hasColumn = await knex.schema.hasColumn('comments', 'pagePath')
  if (!hasColumn) return

  // If pagePath cannot be determined, we cannot reliably know which page a comment belongs to.
  await knex('comments')
    .whereNull('pagePath')
    .orWhere('pagePath', '')
    .delete()
}

exports.down = knex => { }

