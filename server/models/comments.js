const Model = require('objection').Model
const validate = require('validate.js')
const _ = require('lodash')
const commentPathHelper = require('../helpers/comment-path')

/* global WIKI */

/**
 * Comments model
 */
module.exports = class Comment extends Model {
  static get tableName() { return 'comments' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: [],

      properties: {
        id: {type: 'integer'},
        content: {type: 'string'},
        render: {type: 'string'},
        selector: {type: ['string', 'null']},
        selectedText: {type: ['string', 'null']},
        replyTo: {type: 'integer'},
        pageId: {type: 'integer'},
        pagePath: {type: 'string'},
        authorId: {type: 'integer'},
        name: {type: 'string'},
        email: {type: 'string'},
        ip: {type: 'string'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
      }
    }
  }

  static get relationMappings() {
    return {
      author: {
        relation: Model.BelongsToOneRelation,
        modelClass: require('./users'),
        join: {
          from: 'comments.authorId',
          to: 'users.id'
        }
      },
      page: {
        relation: Model.BelongsToOneRelation,
        modelClass: require('./pages'),
        join: {
          from: 'comments.pageId',
          to: 'pages.id'
        }
      }
    }
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString()
  }
  $beforeInsert() {
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  /**
   * Post New Comment
   */
  static async postNewComment ({ pageId, pagePath, pageLocale, replyTo, content, selector, selectedText, guestName, guestEmail, user, ip }) {
    console.error(`(MODELS/COMMENTS) postNewComment: selector=${selector || 'none'}, text=${selectedText || 'none'}`)
    const canonicalLocale = _.get(WIKI, 'config.lang.code', 'en')
    const threadKeyIncludesLocale = _.get(WIKI, 'data.commentProvider.config.threadKeyIncludesLocale', false)

    // -> Input validation
    if (user.id === 2) {
      const validation = validate({
        email: _.toLower(guestEmail),
        name: guestName
      }, {
        email: {
          email: true,
          length: {
            maximum: 255
          }
        },
        name: {
          presence: {
            allowEmpty: false
          },
          length: {
            minimum: 2,
            maximum: 255
          }
        }
      }, { format: 'flat' })

      if (validation && validation.length > 0) {
        throw new WIKI.Error.InputInvalid(validation[0])
      }
    }

    content = _.trim(content)
    if (content.length < 2) {
      throw new WIKI.Error.CommentContentMissing()
    }

    // -> Canonicalize target path for comment identity
    let parsedTarget = null
    if (pagePath) {
      parsedTarget = commentPathHelper.canonicalCommentPath(pagePath, pageLocale || null)
      pagePath = parsedTarget.key
    }

    // -> Load Page (for permission checks / provider metadata)
    let page = null
    if (pageId) {
      page = await WIKI.models.pages.getPageFromDb(pageId)
      if (page && !pagePath) {
        parsedTarget = commentPathHelper.canonicalCommentPath(page.path, page.localeCode)
        pagePath = parsedTarget.key
      }
    } else if (pagePath) {
      // Prefer target locale when thread keys include locale; otherwise prefer canonical locale.
      const preferredLocale = threadKeyIncludesLocale ? _.get(parsedTarget, 'locale', canonicalLocale) : canonicalLocale
      const preferredPath = _.get(parsedTarget, 'path', null)

      page = await WIKI.models.pages.query()
        .findOne({ localeCode: preferredLocale, path: preferredPath })
        .withGraphJoined('tags')
        .modifyGraph('tags', builder => builder.select('tag'))

      if (!page) {
        page = await WIKI.models.pages.query()
          .findOne({ path: preferredPath })
          .withGraphJoined('tags')
          .modifyGraph('tags', builder => builder.select('tag'))
      }
    } else {
      throw new WIKI.Error.InputInvalid('Either pageId or pagePath required')
    }

    if (!page) {
      throw new WIKI.Error.PageNotFound()
    }

    // -> Enforce 1-level nesting: replies-to-replies always target the root comment.
    // Also validate that the reply target exists and is part of the same canonical pagePath.
    replyTo = _.toInteger(replyTo || 0)
    if (replyTo > 0) {
      const parent = await this.query().select('id', 'replyTo', 'pageId', 'pagePath').findById(replyTo)
      if (!parent) {
        throw new WIKI.Error.CommentNotFound()
      }
      if (parent.pagePath && parent.pagePath !== pagePath) {
        throw new WIKI.Error.InputInvalid('Invalid reply target.')
      }
      if (_.toInteger(parent.replyTo) > 0) {
        replyTo = _.toInteger(parent.replyTo)
      }
    }

    if (!WIKI.auth.checkAccess(user, ['write:comments'], {
      path: page.path,
      locale: page.localeCode,
      tags: page.tags
    })) {
      throw new WIKI.Error.CommentPostForbidden()
    }

    // -> Deterministic pageId cache:
    // Prefer canonical locale page id for this path (comments are keyed by pagePath).
    let commentPageId = page.id
    if (pagePath && !threadKeyIncludesLocale) {
      const canonicalPage = await WIKI.models.pages.query().select('id')
        .findOne({ localeCode: canonicalLocale, path: page.path })
      if (canonicalPage) commentPageId = canonicalPage.id
    }

    // -> Process by comment provider
    return WIKI.data.commentProvider.create({
      page,
      commentPageId,
      commentPagePath: pagePath,
      replyTo,
      content,
      selector: selector || null,
      selectedText: selectedText || null,
      user: {
        ...user,
        ...(user.id === 2) ? {
          name: guestName,
          email: guestEmail
        } : {},
        ip
      }
    })
  }

  /**
   * Update an Existing Comment
   */
  static async updateComment ({ id, content, user, ip }) {
    // -> Load Page
    const pageId = await WIKI.data.commentProvider.getPageIdFromCommentId(id)
    if (!pageId) {
      throw new WIKI.Error.CommentNotFound()
    }
    const page = await WIKI.models.pages.getPageFromDb(pageId)
    if (page) {
      if (!WIKI.auth.checkAccess(user, ['manage:comments'], {
        path: page.path,
        locale: page.localeCode,
        tags: page.tags
      })) {
        throw new WIKI.Error.CommentManageForbidden()
      }
    } else {
      throw new WIKI.Error.PageNotFound()
    }

    // -> Process by comment provider
    return WIKI.data.commentProvider.update({
      id,
      content,
      page,
      user: {
        ...user,
        ip
      }
    })
  }

  /**
   * Delete an Existing Comment
   */
  static async deleteComment ({ id, user, ip }) {
    // -> Load Page
    const pageId = await WIKI.data.commentProvider.getPageIdFromCommentId(id)
    if (!pageId) {
      throw new WIKI.Error.CommentNotFound()
    }
    const page = await WIKI.models.pages.getPageFromDb(pageId)
    if (page) {
      if (!WIKI.auth.checkAccess(user, ['manage:comments'], {
        path: page.path,
        locale: page.localeCode,
        tags: page.tags
      })) {
        throw new WIKI.Error.CommentManageForbidden()
      }
    } else {
      throw new WIKI.Error.PageNotFound()
    }

    // -> Process by comment provider
    await WIKI.data.commentProvider.remove({
      id,
      page,
      user: {
        ...user,
        ip
      }
    })
  }
}
