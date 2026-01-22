exports.up = async knex => {
  // SQLite has limited ALTER COLUMN support; no-op here.
  return Promise.resolve()
}

exports.down = knex => { }
