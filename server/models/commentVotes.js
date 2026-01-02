const _ = require('lodash')

/* global WIKI */

module.exports = {
  /**
   * Create or update a vote for a comment.
   */
  async vote ({ commentId, userId, voteType }) {
    if (!Number.isInteger(commentId) || commentId < 1) {
      throw new WIKI.Error.InputInvalid('Invalid comment id.')
    }
    if (!Number.isInteger(userId) || userId < 1) {
      throw new WIKI.Error.InputInvalid('Invalid user id.')
    }
    if (userId === 2) {
      throw new WIKI.Error.CommentVoteForbidden()
    }
    if (!['upvote', 'downvote'].includes(voteType)) {
      throw new WIKI.Error.InputInvalid('Invalid vote type.')
    }

    const now = new Date().toISOString()

    await WIKI.models.knex.transaction(async trx => {
      const updated = await trx('commentVotes')
        .where({ commentId, userId })
        .update({
          voteType,
          updatedAt: now
        })

      if (updated === 0) {
        await trx('commentVotes').insert({
          commentId,
          userId,
          voteType,
          createdAt: now,
          updatedAt: now
        })
      }
    })
  },

  /**
   * Remove an existing vote for a comment.
   */
  async removeVote ({ commentId, userId }) {
    if (!Number.isInteger(commentId) || commentId < 1) {
      throw new WIKI.Error.InputInvalid('Invalid comment id.')
    }
    if (!Number.isInteger(userId) || userId < 1) {
      throw new WIKI.Error.InputInvalid('Invalid user id.')
    }
    if (userId === 2) {
      throw new WIKI.Error.CommentVoteForbidden()
    }

    await WIKI.models.knex('commentVotes')
      .where({ commentId, userId })
      .del()
  },

  /**
   * Return vote counts for a single comment.
   */
  async getVoteCounts (commentId) {
    const countsById = await this.getVoteCountsForComments([commentId])
    return _.get(countsById, commentId, { upvotes: 0, downvotes: 0 })
  },

  /**
   * Return the vote type for a single (commentId,userId) pair.
   */
  async getUserVote ({ commentId, userId }) {
    if (!Number.isInteger(commentId) || commentId < 1) {
      return null
    }
    if (!Number.isInteger(userId) || userId < 1 || userId === 2) {
      return null
    }

    const row = await WIKI.models.knex('commentVotes')
      .select('voteType')
      .where({ commentId, userId })
      .first()

    return row ? row.voteType : null
  },

  /**
   * Batch vote counts lookup.
   *
   * @return {Object} map[commentId] = { upvotes, downvotes }
   */
  async getVoteCountsForComments (commentIds) {
    const ids = _(commentIds).filter(id => Number.isInteger(id) && id > 0).uniq().value()
    if (ids.length < 1) {
      return {}
    }

    const rows = await WIKI.models.knex('commentVotes')
      .select('commentId', 'voteType')
      .count({ count: 'id' })
      .whereIn('commentId', ids)
      .groupBy('commentId', 'voteType')

    const result = _.fromPairs(ids.map(id => [id, { upvotes: 0, downvotes: 0 }]))
    for (const row of rows) {
      const commentId = _.toInteger(row.commentId)
      const count = _.toInteger(row.count)
      if (!result[commentId]) {
        result[commentId] = { upvotes: 0, downvotes: 0 }
      }
      if (row.voteType === 'upvote') result[commentId].upvotes = count
      if (row.voteType === 'downvote') result[commentId].downvotes = count
    }

    return result
  },

  /**
   * Batch user votes lookup.
   *
   * @return {Object} map[commentId] = 'upvote' | 'downvote'
   */
  async getUserVotesForComments ({ commentIds, userId }) {
    const ids = _(commentIds).filter(id => Number.isInteger(id) && id > 0).uniq().value()
    if (ids.length < 1) {
      return {}
    }
    if (!Number.isInteger(userId) || userId < 1 || userId === 2) {
      return {}
    }

    const rows = await WIKI.models.knex('commentVotes')
      .select('commentId', 'voteType')
      .where({ userId })
      .whereIn('commentId', ids)

    return _.fromPairs(rows.map(r => [_.toInteger(r.commentId), r.voteType]))
  }
}
