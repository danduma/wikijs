exports.up = knex => {
  return knex.schema.createTable('commentVotes', table => {
    table.increments('id').primary()
    table.integer('commentId').unsigned().notNullable()
      .references('id').inTable('comments').onDelete('CASCADE')
    table.integer('userId').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
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
