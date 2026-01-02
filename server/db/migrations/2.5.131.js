/* global WIKI */

exports.up = knex => {
  const dbCompat = {
    charset: (WIKI.config.db.type === `mysql` || WIKI.config.db.type === `mariadb`),
    selfCascadeDelete: WIKI.config.db.type !== 'mssql'
  }

  return knex.schema.createTable('commentVotes', table => {
    if (dbCompat.charset) { table.charset('utf8mb4') }
    table.increments('id').primary()
    table.integer('commentId').unsigned().notNullable()
      .references('id').inTable('comments')
      .onDelete(dbCompat.selfCascadeDelete ? 'CASCADE' : 'NO ACTION')
    table.integer('userId').unsigned().notNullable()
      .references('id').inTable('users')
      .onDelete(dbCompat.selfCascadeDelete ? 'CASCADE' : 'NO ACTION')
    table.enum('voteType', ['upvote', 'downvote']).notNullable()
    table.string('createdAt').notNullable()
    table.string('updatedAt').notNullable()

    table.unique(['commentId', 'userId'])
    table.index(['commentId', 'voteType'])
  })
}

exports.down = knex => {
  return knex.schema.dropTableIfExists('commentVotes')
}
