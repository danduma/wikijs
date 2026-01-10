const _ = require('lodash')
const graphHelper = require('../../helpers/graph')
const commentPathHelper = require('../../helpers/comment-path')

/* global WIKI */

async function getPageAccessFromCommentId (commentId) {
  const pageId = await WIKI.data.commentProvider.getPageIdFromCommentId(commentId)
  if (!pageId) {
    throw new WIKI.Error.CommentNotFound()
  }

  const page = await WIKI.models.pages.query().select('localeCode', 'path').findById(pageId)
    .withGraphJoined('tags')
    .modifyGraph('tags', builder => {
      builder.select('tag')
    })

  if (!page) {
    throw new WIKI.Error.PageNotFound()
  }

  return page
}

module.exports = {
  Query: {
    async comments() { return {} }
  },
  Mutation: {
    async comments() { return {} }
  },
  CommentQuery: {
    /**
     * Fetch list of Comments Providers
     */
    async providers(obj, args, context, info) {
      const providers = await WIKI.models.commentProviders.getProviders()
      return providers.map(provider => {
        const providerInfo = _.find(WIKI.data.commentProviders, ['key', provider.key]) || {}
        return {
          ...providerInfo,
          ...provider,
          config: _.sortBy(_.transform(provider.config, (res, value, key) => {
            const configData = _.get(providerInfo.props, key, false)
            if (configData) {
              res.push({
                key,
                value: JSON.stringify({
                  ...configData,
                  value
                })
              })
            }
          }, []), 'key')
        }
      })
    },
    /**
     * Fetch active comment provider key (safe for non-admin clients)
     */
    async activeProviderKey () {
      return _.get(WIKI, 'data.commentProvider.key', 'default')
    },
    /**
     * Fetch list of comments for a page
     */
    async list (obj, args, context) {
      const target = commentPathHelper.canonicalCommentPath(args.path, args.locale)
      const page = await WIKI.models.pages.query().select('pages.id').findOne({ localeCode: args.locale, path: target.path })
        .withGraphJoined('tags')
        .modifyGraph('tags', builder => {
          builder.select('tag')
        })
      if (page) {
        if (WIKI.auth.checkAccess(context.req.user, ['read:comments'], { tags: page.tags, locale: args.locale, path: target.path })) {
          const comments = await WIKI.models.comments.query().where('pagePath', target.key).orderBy('createdAt')
          const commentIds = comments.map(c => c.id)
          const voteCountsById = await WIKI.models.commentVotes.getVoteCountsForComments(commentIds)
          const userVotesById = await WIKI.models.commentVotes.getUserVotesForComments({ commentIds, userId: context.req.user.id })
          const replyCountsByParent = _.countBy(comments.filter(c => _.toInteger(c.replyTo) > 0), c => _.toInteger(c.replyTo))

          return comments.map(c => ({
            ...c,
            pagePath: c.pagePath || target.key,
            authorName: c.name,
            authorEmail: c.email,
            authorIP: c.ip,
            selector: c.selector,
            selectedText: c.selectedText,
            replyTo: c.replyTo,
            replyCount: _.toInteger(replyCountsByParent[_.toInteger(c.id)] || 0),
            voteCounts: _.get(voteCountsById, _.toInteger(c.id), { upvotes: 0, downvotes: 0 }),
            userVote: _.get(userVotesById, _.toInteger(c.id), null)
          }))
        } else {
          throw new WIKI.Error.CommentViewForbidden()
        }
      } else {
        return []
      }
    },
    /**
     * Fetch a single comment
     */
    async single (obj, args, context) {
      const cm = await WIKI.data.commentProvider.getCommentById(args.id)
      if (!cm) {
        throw new WIKI.Error.CommentNotFound()
      }
      const canonicalLocale = _.get(WIKI, 'config.lang.code', 'en')
      const threadKeyIncludesLocale = _.get(WIKI, 'data.commentProvider.config.threadKeyIncludesLocale', false)
      let page = null
      if (cm.pageId) {
        page = await WIKI.models.pages.query().select('localeCode', 'path').findById(cm.pageId)
          .withGraphJoined('tags')
          .modifyGraph('tags', builder => {
            builder.select('tag')
          })
      } else if (cm.pagePath) {
        const target = commentPathHelper.canonicalCommentPath(cm.pagePath)
        const preferredLocale = threadKeyIncludesLocale ? target.locale : canonicalLocale
        page = await WIKI.models.pages.query().select('id', 'localeCode', 'path')
          .findOne({ localeCode: preferredLocale, path: target.path })
          .withGraphJoined('tags')
          .modifyGraph('tags', builder => {
            builder.select('tag')
          })
        if (!page) {
          page = await WIKI.models.pages.query().select('id', 'localeCode', 'path')
            .findOne({ path: target.path })
            .withGraphJoined('tags')
            .modifyGraph('tags', builder => {
              builder.select('tag')
            })
        }
      }
      if (page) {
        if (WIKI.auth.checkAccess(context.req.user, ['read:comments'], {
          path: page.path,
          locale: page.localeCode,
          tags: page.tags
        })) {
          const voteCounts = await WIKI.models.commentVotes.getVoteCounts(cm.id)
          const userVote = await WIKI.models.commentVotes.getUserVote({ commentId: cm.id, userId: context.req.user.id })
          const replyCount = await WIKI.models.comments.query().where({ replyTo: cm.id }).count({ count: 'id' }).first()
          return {
            ...cm,
            pagePath: cm.pagePath || commentPathHelper.canonicalCommentPath(page.path, page.localeCode).key,
            authorName: cm.name,
            authorEmail: cm.email,
            authorIP: cm.ip,
            selector: cm.selector,
            selectedText: cm.selectedText,
            replyTo: cm.replyTo,
            replyCount: _.toInteger(_.get(replyCount, 'count', 0)),
            voteCounts,
            userVote
          }
        } else {
          throw new WIKI.Error.CommentViewForbidden()
        }
      } else {
        WIKI.logger.warn(`Comment #${cm.id} is linked to a page that doesn't exist! [ERROR]`)
        throw new WIKI.Error.CommentGenericError()
      }
    }
  },
  CommentMutation: {
    /**
     * Create New Comment
     */
    async create (obj, args, context) {
      console.error('(GRAPHQL) Mutation create comment args:', JSON.stringify(args))
      try {
        const cmId = await WIKI.models.comments.postNewComment({
          ...args,
          user: context.req.user,
          ip: context.req.ip
        })
        return {
          responseResult: graphHelper.generateSuccess('New comment posted successfully'),
          id: cmId
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    /**
     * Update an Existing Comment
     */
    async update (obj, args, context) {
      try {
        const cmRender = await WIKI.models.comments.updateComment({
          ...args,
          user: context.req.user,
          ip: context.req.ip
        })
        return {
          responseResult: graphHelper.generateSuccess('Comment updated successfully'),
          render: cmRender
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    /**
     * Delete an Existing Comment
     */
    async delete (obj, args, context) {
      try {
        await WIKI.models.comments.deleteComment({
          id: args.id,
          user: context.req.user,
          ip: context.req.ip
        })
        return {
          responseResult: graphHelper.generateSuccess('Comment deleted successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async vote (obj, args, context) {
      try {
        if (context.req.user.id === 2) {
          throw new WIKI.Error.CommentVoteForbidden()
        }

        const page = await getPageAccessFromCommentId(args.commentId)
        if (!WIKI.auth.checkAccess(context.req.user, ['write:comments'], {
          path: page.path,
          locale: page.localeCode,
          tags: page.tags
        })) {
          throw new WIKI.Error.CommentVoteForbidden()
        }

        await WIKI.models.commentVotes.vote({
          commentId: args.commentId,
          userId: context.req.user.id,
          voteType: args.voteType
        })

        const voteCounts = await WIKI.models.commentVotes.getVoteCounts(args.commentId)
        const userVote = await WIKI.models.commentVotes.getUserVote({ commentId: args.commentId, userId: context.req.user.id })

        return {
          responseResult: graphHelper.generateSuccess('Vote updated successfully'),
          voteCounts,
          userVote
        }
      } catch (err) {
        return {
          ...graphHelper.generateError(err),
          voteCounts: { upvotes: 0, downvotes: 0 },
          userVote: null
        }
      }
    },
    async removeVote (obj, args, context) {
      try {
        if (context.req.user.id === 2) {
          throw new WIKI.Error.CommentVoteForbidden()
        }

        const page = await getPageAccessFromCommentId(args.commentId)
        if (!WIKI.auth.checkAccess(context.req.user, ['write:comments'], {
          path: page.path,
          locale: page.localeCode,
          tags: page.tags
        })) {
          throw new WIKI.Error.CommentVoteForbidden()
        }

        await WIKI.models.commentVotes.removeVote({
          commentId: args.commentId,
          userId: context.req.user.id
        })

        const voteCounts = await WIKI.models.commentVotes.getVoteCounts(args.commentId)
        const userVote = await WIKI.models.commentVotes.getUserVote({ commentId: args.commentId, userId: context.req.user.id })

        return {
          responseResult: graphHelper.generateSuccess('Vote removed successfully'),
          voteCounts,
          userVote
        }
      } catch (err) {
        return {
          ...graphHelper.generateError(err),
          voteCounts: { upvotes: 0, downvotes: 0 },
          userVote: null
        }
      }
    },
    /**
     * Update Comments Providers
     */
    async updateProviders(obj, args, context) {
      try {
        for (let provider of args.providers) {
          await WIKI.models.commentProviders.query().patch({
            isEnabled: provider.isEnabled,
            config: _.reduce(provider.config, (result, value, key) => {
              _.set(result, `${value.key}`, _.get(JSON.parse(value.value), 'v', null))
              return result
            }, {})
          }).where('key', provider.key)
        }
        await WIKI.models.commentProviders.initProvider()
        return {
          responseResult: graphHelper.generateSuccess('Comment Providers updated successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
