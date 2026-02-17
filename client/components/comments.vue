<template lang="pug">
  div
    //- Contextual selection FAB
    v-menu(
      v-model='showFloatingBtn'
      v-if='isContextualProvider'
      attach='.v-application'
      absolute
      :position-x='floatingBtnX'
      :position-y='floatingBtnY'
      :close-on-content-click='false'
      :close-on-click='false'
      z-index='2200'
      content-class='contextual-fab-menu'
      transition='scale-transition'
    )
      div.contextual-fab-wrapper(ref='contextualFab', data-ui-id='LongevidenceContextualCommentFab')
        v-btn.floating-comment-btn(
          fab
          x-small
          color='primary'
          @mousedown.stop.prevent
          @click.stop='openNewThread'
          data-ui-id='LongevidenceContextualCommentFabButton'
        )
          v-icon(small) mdi-comment-plus

    v-dialog(
      v-model='showThreadDialog'
      v-if='isContextualProvider'
      attach='.v-application'
      hide-overlay
      persistent
      :retain-focus='false'
      content-class='contextual-thread-dialog'
    )
      div.contextual-thread-wrapper(:style='threadWindowStyle', ref='threadWindow', data-ui-id='LongevidenceContextualCommentThreadWindow')
        v-card.floating-thread-window.elevation-10
          v-toolbar(
            color='primary'
            dark
            dense
            flat
            style='cursor: move; user-select: none;'
            @mousedown='startDrag'
          )
            v-toolbar-title.body-1 {{ isNewThread ? "New Comment" : "Comment Thread" }}
            v-spacer
            v-btn(icon, small, @click='closeThreadDialog')
              v-icon(small) mdi-close

          .thread-content.pa-3
            //- Existing thread messages
            template(v-if='!isNewThread && activeThreadRoot')
              //- Root message
              .thread-message.mb-4
                .d-flex.align-center.mb-1
                  v-avatar(color='blue-grey', size='24')
                    span.white--text.caption {{ getInitials(activeThreadRoot.authorName) }}
                  .caption.ml-2.font-weight-bold {{ activeThreadRoot.authorName }}
                  v-spacer
                  .overline.grey--text {{ activeThreadRoot.createdAt | moment('from') }}
                .body-2.pl-8(v-html='activeThreadRoot.render')

              //- Nested replies
              .thread-replies.pl-4.ml-2(v-if='activeThreadReplies.length > 0', style='border-left: 2px solid rgba(144, 164, 174, 0.2)')
                .thread-message.mb-4(v-for='msg in activeThreadReplies' :key='msg.id')
                  .d-flex.align-center.mb-1
                    v-avatar(color='blue-grey', size='20')
                      span.white--text.caption(style='font-size: 10px !important') {{ getInitials(msg.authorName) }}
                    .caption.ml-2.font-weight-bold {{ msg.authorName }}
                    v-spacer
                    .overline.grey--text {{ msg.createdAt | moment('from') }}
                  .body-2.pl-7(v-html='msg.render')

              v-divider.my-3

            //- Reply/New Comment Box
            template(v-if='isNewThread && !isAuthenticated')
              .body-2
                span You need to be logged in to comment -
                a.ml-1(href='/register') [Create a free account]
                span.ml-1 or
                a.ml-1(href='/login') [Login]
            template(v-else)
              v-textarea.thread-window-textarea(
                outlined
                flat
                dense
                rows='3'
                hide-details
                v-model='newThreadContent'
                :placeholder='isNewThread ? "Write your comment..." : "Write a reply..."'
                ref='threadTextarea'
                @keydown.enter='handleThreadEnter'
              )
              .d-flex.pt-2
                v-spacer
                v-btn(
                  color='primary'
                  small
                  depressed
                  @click='submitThreadComment'
                  :loading='isBusy'
                ) {{ isNewThread ? "Post" : "Reply" }}

    v-textarea#discussion-new(
      outlined
      flat
      :placeholder='$t(`common:comments.newPlaceholder`)'
      auto-grow
      dense
      rows='3'
      hide-details
      v-model='newcomment'
      color='blue-grey darken-2'
      :background-color='$vuetify.theme.dark ? `grey darken-5` : `white`'
      v-if='permissions.write'
      :aria-label='$t(`common:comments.fieldContent`)'
      @keydown.enter='handleMainEnter'
    )
    v-row.mt-2(dense, v-if='!isAuthenticated && permissions.write')
      v-col(cols='12', lg='6')
        v-text-field(
          outlined
          color='blue-grey darken-2'
          :background-color='$vuetify.theme.dark ? `grey darken-5` : `white`'
          :placeholder='$t(`common:comments.fieldName`)'
          hide-details
          dense
          autocomplete='name'
          v-model='guestName'
          :aria-label='$t(`common:comments.fieldName`)'
        )
      v-col(cols='12', lg='6')
        v-text-field(
          outlined
          color='blue-grey darken-2'
          :background-color='$vuetify.theme.dark ? `grey darken-5` : `white`'
          :placeholder='$t(`common:comments.fieldEmail`)'
          hide-details
          type='email'
          dense
          autocomplete='email'
          v-model='guestEmail'
          :aria-label='$t(`common:comments.fieldEmail`)'
        )
    .d-flex.align-center.pt-3(v-if='permissions.write')
      v-icon.mr-1(color='blue-grey') mdi-language-markdown-outline
      .caption.blue-grey--text {{$t('common:comments.markdownFormat')}}
      v-spacer
      .caption.mr-3(v-if='isAuthenticated')
        i18next(tag='span', path='common:comments.postingAs')
          strong(place='name') {{userDisplayName}}
      v-btn(
        dark
        color='blue-grey darken-2'
        @click='postComment'
        depressed
        :aria-label='$t(`common:comments.postComment`)'
        )
        v-icon(left) mdi-comment
        span.text-none {{$t('common:comments.postComment')}}
    v-divider.mt-3(v-if='permissions.write')
    .pa-5.d-flex.align-center.justify-center(v-if='isLoading && !hasLoadedOnce')
      v-progress-circular(
        indeterminate
        size='20'
        width='1'
        color='blue-grey'
      )
      .caption.blue-grey--text.pl-3: em {{$t('common:comments.loading')}}
    v-timeline(
      dense
      v-else-if='commentsWithReplies && commentsWithReplies.length > 0'
      )
      v-timeline-item.comments-post(
        color='pink darken-4'
        large
        v-for='cm of commentsWithReplies'
        :key='`comment-` + cm.id'
        :id='`comment-post-id-` + cm.id'
        )
        template(v-slot:icon)
          v-avatar(color='blue-grey')
            //- v-img(src='http://i.pravatar.cc/64')
            span.white--text.title {{cm.initials}}
        v-card.elevation-1
          v-card-text
            .comments-post-actions(v-if='permissions.manage && !isBusy && commentEditId === 0')
              v-icon.mr-3(small, @click='editComment(cm)') mdi-pencil
              v-icon.mr-3(small, @click='resolveComment(cm)') mdi-check-circle
              v-icon(small, @click='deleteCommentConfirm(cm)') mdi-delete

            .comments-post-name.caption: strong {{cm.authorName}}
            .comments-post-date.overline.grey--text {{cm.createdAt | moment('from') }} #[em(v-if='cm.createdAt !== cm.updatedAt') - {{$t('common:comments.modified', { reldate: $options.filters.moment(cm.updatedAt, 'from') })}}]
            .comments-post-context.caption.grey--text(v-if='(cm.blockId || cm.selector) && isContextualProvider')
              v-icon(small, @click='highlightComment(cm)', color='primary') mdi-target
              span.ml-1(style='cursor: pointer; text-decoration: underline;', @click='highlightComment(cm)') View Context

            .comments-post-content.mt-3(v-if='commentEditId !== cm.id', v-html='cm.render')
            .comments-post-editcontent.mt-3(v-else)
              v-textarea(
                outlined
                flat
                auto-grow
                dense
                rows='3'
                hide-details
                v-model='commentEditContent'
                color='blue-grey darken-2'
                :background-color='$vuetify.theme.dark ? `grey darken-5` : `white`'
                @keydown.enter='handleEditEnter'
              )
              .d-flex.align-center.pt-3
                v-spacer
                v-btn.mr-3(
                  dark
                  color='blue-grey darken-2'
                  @click='editCommentCancel'
                  outlined
                )
                  v-icon(left) mdi-close
                  span.text-none {{$t('common:actions.cancel')}}
                v-btn(
                  dark
                  color='blue-grey darken-2'
                  @click='updateComment'
                  depressed
                )
                  v-icon(left) mdi-comment
                  span.text-none {{$t('common:comments.updateComment')}}

            //- Reddit-like action bar under the comment
            .comment-actions-row.mt-2(v-if='commentEditId !== cm.id')
              CommentVoteButtons(
                :comment-id='cm.id'
                :upvotes='cm.voteCounts ? cm.voteCounts.upvotes : 0'
                :downvotes='cm.voteCounts ? cm.voteCounts.downvotes : 0'
                :user-vote='cm.userVote'
                :disabled='!isAuthenticated'
                @vote-changed='handleVoteChanged'
              )
              v-btn.comment-action-btn.ml-3(
                v-if='permissions.write && !isBusy'
                text
                x-small
                color='blue-grey'
                :disabled='replyToId !== 0 && replyToId !== cm.id'
                @click='startReply(cm.id)'
              )
                v-icon(left, small) mdi-comment-outline
                span Reply
                span.comment-action-count.ml-2(v-if='(cm.replyCount || 0) > 0') {{ cm.replyCount }}
              v-btn.comment-action-btn.ml-2(
                v-if='(cm.replyCount || 0) > 0'
                text
                x-small
                color='blue-grey'
                @click='toggleThread(cm.id)'
              )
                v-icon(left, small) {{ cm.isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                span {{ cm.isExpanded ? 'Hide' : 'Show' }}

            //- Inline reply form (root)
            .comment-reply-form.mt-3(v-if='replyToId === cm.id')
              v-textarea(
                outlined
                flat
                auto-grow
                dense
                rows='2'
                hide-details
                v-model='replyContent'
                placeholder='Write your reply...'
                color='blue-grey darken-2'
                :background-color='$vuetify.theme.dark ? `grey darken-5` : `white`'
                :ref='`reply-box-${cm.id}`'
                @keydown.enter='handleReplyEnter'
              )
              .d-flex.align-center.pt-2
                v-spacer
                v-btn.mr-2(text, small, @click='cancelReply')
                  v-icon(left, small) mdi-close
                  span Cancel
                v-btn(color='primary', small, depressed, @click='postReply', :loading='isBusy')
                  v-icon(left, small) mdi-send
                  span Post Reply

            //- Collapsible replies
            .comment-replies.mt-3(v-if='cm.isExpanded && cm.replies && cm.replies.length > 0')
              .reply-item(v-for='rp of cm.replies' :key='`reply-` + rp.id')
                .d-flex.align-center
                  .caption.font-weight-bold {{ rp.authorName }}
                  v-spacer
                  .overline.grey--text {{ rp.createdAt | moment('from') }}
                .body-2.mt-2(v-html='rp.render')

                .comment-actions-row.mt-2(v-if='commentEditId !== rp.id')
                  CommentVoteButtons(
                    :comment-id='rp.id'
                    :upvotes='rp.voteCounts ? rp.voteCounts.upvotes : 0'
                    :downvotes='rp.voteCounts ? rp.voteCounts.downvotes : 0'
                    :user-vote='rp.userVote'
                    :disabled='!isAuthenticated'
                    @vote-changed='handleVoteChanged'
                  )
                  v-btn.comment-action-btn.ml-3(
                    v-if='permissions.write && !isBusy'
                    text
                    x-small
                    color='blue-grey'
                    :disabled='replyToId !== 0 && replyToId !== rp.id'
                    @click='startReply(rp.id)'
                  )
                    v-icon(left, small) mdi-comment-outline
                    span Reply
                  v-spacer
                  template(v-if='permissions.manage && !isBusy && commentEditId === 0')
                    v-icon.mr-3(small, @click='editComment(rp)') mdi-pencil
                    v-icon.mr-3(small, @click='resolveComment(rp)') mdi-check-circle
                    v-icon(small, @click='deleteCommentConfirm(rp)') mdi-delete

                .comment-reply-form.mt-3(v-if='replyToId === rp.id')
                  v-textarea(
                    outlined
                    flat
                    auto-grow
                    dense
                    rows='2'
                    hide-details
                    v-model='replyContent'
                    placeholder='Write your reply...'
                    color='blue-grey darken-2'
                    :background-color='$vuetify.theme.dark ? `grey darken-5` : `white`'
                    :ref='`reply-box-${rp.id}`'
                    @keydown.enter='handleReplyEnter'
                  )
                  .d-flex.align-center.pt-2
                    v-spacer
                    v-btn.mr-2(text, small, @click='cancelReply')
                      v-icon(left, small) mdi-close
                      span Cancel
                    v-btn(color='primary', small, depressed, @click='postReply', :loading='isBusy')
                      v-icon(left, small) mdi-send
                      span Post Reply
    .pt-5.text-center.body-2.blue-grey--text(v-else-if='permissions.write') {{$t('common:comments.beFirst')}}
    .text-center.body-2.blue-grey--text(v-else) {{$t('common:comments.none')}}

    v-dialog(v-model='deleteCommentDialogShown', max-width='500')
      v-card
        .dialog-header.is-red {{$t('common:comments.deleteConfirmTitle')}}
        v-card-text.pt-5
          span {{$t('common:comments.deleteWarn')}}
          .caption: strong {{$t('common:comments.deletePermanentWarn')}}
        v-card-chin
          v-spacer
          v-btn(text, @click='deleteCommentDialogShown = false') {{$t('common:actions.cancel')}}
          v-btn(color='red', dark, @click='deleteComment') {{$t('common:actions.delete')}}
</template>

<script>
import gql from 'graphql-tag'
import { get } from 'vuex-pathify'
import validate from 'validate.js'
import _ from 'lodash'
import CommentVoteButtons from './comments/CommentVoteButtons.vue'
import { escapeAttrValue, findCommentElement, getElementPagePositionFromElement, getElementViewportPositionFromElement } from '../helpers/comments-positioning'

/* global siteConfig */

export default {
  props: {
    providerKey: {
      type: String,
      default: null
    }
  },
  components: {
    CommentVoteButtons
  },
  data () {
    return {
      newcomment: '',
      isLoading: true,
      hasLoadedOnce: false,
      comments: [],
      guestName: '',
      guestEmail: '',
      commentToDelete: {},
      commentEditId: 0,
      commentEditContent: null,
      deleteCommentDialogShown: false,
      isBusy: false,
      expandedThreads: {},
      replyToId: 0,
      replyContent: '',
      selectedText: '',
      selectedBlockId: '',
      selectedSelector: '',
      commentProviderKey: null,
      showFloatingBtn: false,
      floatingBtnStyle: {
        top: '0px',
        left: '0px'
      },
      pendingSelector: '',
      pendingBlockId: '',
      pendingText: '',
      currentSelector: '',
      currentBlockId: '',
      currentText: '',
      showThreadDialog: false,
      activeThread: null,
      threadReplies: [],
      newThreadContent: '',
      isNewThread: false,
      isMouseDown: false,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      dragPosition: null,
      isTouchDevice: false,
      longPressTimer: null,
      longPressStart: null,
      longPressTarget: null,
      longPressFired: false,
      scrollOpts: {
        duration: 1500,
        offset: 0,
        easing: 'easeInOutCubic'
      }
    }
  },
  computed: {
    pageId: get('page/id'),
    permissions: get('page/effectivePermissions@comments'),
    isAuthenticated: get('user/authenticated'),
    userDisplayName: get('user/name'),
    isLongevidenceTheme () {
      return (typeof siteConfig !== 'undefined' && siteConfig.theme === 'longevidence')
    },
    isContextualProvider () {
      // Determine active provider in a way that works for non-admin users:
      // 1) prop from server-rendered `<comments provider-key="...">`
      // 2) GraphQL query fallback
      // 3) global `siteConfig` fallback (server-injected)
      const key = _.defaultTo(
        this.providerKey,
        _.defaultTo(
          _.get(this.commentProviderKey, 'activeProviderKey', null),
          (typeof siteConfig !== 'undefined') ? _.get(siteConfig, 'commentProviderKey', null) : null
        )
      )
      return key === 'contextual'
    },
    shouldEnableMobileLongPress () {
      return this.isTouchDevice && this.isLongevidenceTheme && this.isContextualProvider
    },
    bottomComments () {
      return this.comments.filter(c => !c.replyTo || c.replyTo === 0)
    },
    commentsWithReplies () {
      const rootComments = this.comments.filter(c => !c.replyTo || c.replyTo === 0)
      return rootComments.map(root => ({
        ...root,
        replies: this.comments.filter(c => c.replyTo === root.id),
        isExpanded: this.expandedThreads[root.id] || false
      }))
    },
    activeThreadRoot () {
      if (!this.activeThread) return null
      return this.comments.find(c => c.id === this.activeThread.id)
    },
    activeThreadReplies () {
      if (!this.activeThread) return []
      return this.comments.filter(c => c.replyTo === this.activeThread.id)
    },
    floatingBtnX () {
      if (typeof window === 'undefined') return 0
      if (!this.floatingBtnStyle || !this.floatingBtnStyle.left) return 0
      return parseInt(this.floatingBtnStyle.left, 10) + window.pageXOffset
    },
    floatingBtnY () {
      if (typeof window === 'undefined') return 0
      if (!this.floatingBtnStyle || !this.floatingBtnStyle.top) return 0
      return parseInt(this.floatingBtnStyle.top, 10) + window.pageYOffset
    },
    threadWindowStyle () {
      if (typeof window === 'undefined') return {}
      if (this.dragPosition) {
        return {
          position: 'fixed',
          top: `${this.dragPosition.y}px`,
          left: `${this.dragPosition.x}px`,
          width: '350px',
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2210,
          overflow: 'hidden'
        }
      }

      if (!this.floatingBtnStyle) return {}

      const width = 350
      const height = 500
      let top = parseInt(this.floatingBtnStyle.top)
      let left = parseInt(this.floatingBtnStyle.left) + 40

      // Keep inside viewport
      if (left + width > window.innerWidth) {
        left = parseInt(this.floatingBtnStyle.left) - width - 40
      }
      if (top + height > window.innerHeight) {
        top = window.innerHeight - height - 20
      }
      if (top < 20) top = 20
      if (left < 20) left = 20

      return {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        maxHeight: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2210,
        overflow: 'hidden'
      }
    }
  },
  watch: {
    isContextualProvider (newValue) {
      if (newValue) {
        this.setupTextSelection()
      } else {
        this.cleanupTextSelection()
      }
    },
    comments: {
      deep: true,
      handler () {
        if (this.isContextualProvider) {
          this.$nextTick(() => {
            this.processContextualComments()
          })
        }
      }
    }
  },
  apollo: {
    commentProviderKey: {
      query: gql`
        query {
          commentProviderKey: comments {
            activeProviderKey
          }
        }
      `,
      update: (data) => _.get(data, 'commentProviderKey', null),
      fetchPolicy: 'network-only'
    }
  },
  methods: {
    toggleThread (commentId) {
      this.$set(this.expandedThreads, commentId, !this.expandedThreads[commentId])
    },
    handleVoteChanged ({ commentId, upvotes, downvotes, userVote }) {
      const comment = this.comments.find(c => c.id === commentId)
      if (comment) {
        this.$set(comment, 'voteCounts', { upvotes, downvotes })
        this.$set(comment, 'userVote', userVote)
      }
    },
    startReply (commentId) {
      this.replyToId = commentId
      this.replyContent = ''

      const cm = this.comments.find(c => c.id === commentId)
      const rootId = (cm && cm.replyTo && cm.replyTo > 0) ? cm.replyTo : commentId
      if (!this.expandedThreads[rootId]) {
        this.$set(this.expandedThreads, rootId, true)
      }

      this.$nextTick(() => {
        const replyBox = this.$refs[`reply-box-${commentId}`]
        const ref = Array.isArray(replyBox) ? replyBox[0] : replyBox
        if (ref && typeof ref.focus === 'function') ref.focus()
        else if (ref && ref.$el) ref.$el.querySelector('textarea')?.focus()
      })
    },
    cancelReply () {
      this.replyToId = 0
      this.replyContent = ''
    },
    async postReply () {
      if (!this.replyContent || this.replyContent.length < 2) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: 'Reply must be at least 2 characters.',
          icon: 'alert'
        })
        return
      }

      let rules = {
        comment: {
          presence: { allowEmpty: false },
          length: { minimum: 2 }
        }
      }
      if (!this.isAuthenticated && this.permissions.write) {
        rules.name = {
          presence: { allowEmpty: false },
          length: { minimum: 2, maximum: 255 }
        }
        rules.email = {
          presence: { allowEmpty: false },
          email: true
        }
      }
      const validationResults = validate({
        comment: this.replyContent,
        name: this.guestName,
        email: this.guestEmail
      }, rules, { format: 'flat' })

      if (validationResults) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: validationResults[0],
          icon: 'alert'
        })
        return
      }

      this.isBusy = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $pageId: Int!
              $replyTo: Int
              $content: String!
              $guestName: String
              $guestEmail: String
            ) {
              comments {
                create(
                  pageId: $pageId
                  replyTo: $replyTo
                  content: $content
                  guestName: $guestName
                  guestEmail: $guestEmail
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                  id
                }
              }
            }
          `,
          variables: {
            pageId: this.pageId,
            replyTo: this.replyToId,
            content: this.replyContent,
            guestName: !this.isAuthenticated ? this.guestName : null,
            guestEmail: !this.isAuthenticated ? this.guestEmail : null
          }
        })

        if (_.get(resp, 'data.comments.create.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: 'Reply posted successfully.',
            icon: 'check'
          })

          const repliedTo = this.replyToId
          const replyTarget = this.comments.find(c => c.id === repliedTo)
          const rootId = (replyTarget && replyTarget.replyTo && replyTarget.replyTo > 0) ? replyTarget.replyTo : repliedTo
          this.replyToId = 0
          this.replyContent = ''
          await this.fetch(true)

          this.$nextTick(() => {
            this.$vuetify.goTo(`#comment-post-id-${rootId}`, this.scrollOpts)
          })
        } else {
          throw new Error(_.get(resp, 'data.comments.create.responseResult.message', 'An unexpected error occurred.'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isBusy = false
    },
    async fetch (silent = false) {
      this.isLoading = true
      try {
        const results = await this.$apollo.query({
          query: gql`
            query ($locale: String!, $path: String!) {
              comments {
                list(locale: $locale, path: $path) {
                  id
                  render
                  blockId
                  selector
                  selectedText
                  replyTo
                  replyCount
                  voteCounts { upvotes downvotes }
                  userVote
                  authorName
                  isResolved
                  resolvedBy
                  resolvedAt
                  createdAt
                  updatedAt
                }
              }
            }
          `,
          variables: {
            locale: this.$store.get('page/locale'),
            path: this.$store.get('page/path')
          },
          fetchPolicy: 'network-only'
        })
        this.comments = _.get(results, 'data.comments.list', []).map(c => {
          c.initials = this.getInitials(c.authorName)
          if (!c.voteCounts) c.voteCounts = { upvotes: 0, downvotes: 0 }
          if (typeof c.replyCount !== 'number') c.replyCount = 0
          return c
        })
        this.$root.$emit('comments-updated', this.comments)

        // Process contextual comments
        this.$nextTick(() => {
          setTimeout(() => {
            this.processContextualComments()
          }, 500)
        })
      } catch (err) {
        console.warn(err)
        if (!silent) {
          this.$store.commit('showNotification', {
            style: 'red',
            message: err.message,
            icon: 'alert'
          })
        }
      }
      this.isLoading = false
      this.hasLoadedOnce = true
    },
    /**
     * Post New Comment
     */
    async postComment () {
      let rules = {
        comment: {
          presence: {
            allowEmpty: false
          },
          length: {
            minimum: 2
          }
        }
      }
      if (!this.isAuthenticated && this.permissions.write) {
        rules.name = {
          presence: {
            allowEmpty: false
          },
          length: {
            minimum: 2,
            maximum: 255
          }
        }
        rules.email = {
          presence: {
            allowEmpty: false
          },
          email: true
        }
      }
      const validationResults = validate({
        comment: this.newcomment,
        name: this.guestName,
        email: this.guestEmail
      }, rules, { format: 'flat' })

      if (validationResults) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: validationResults[0],
          icon: 'alert'
        })
        return
      }

      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $pageId: Int!
              $replyTo: Int
              $content: String!
              $blockId: String
              $selector: String
              $guestName: String
              $guestEmail: String
            ) {
              comments {
                create (
                  pageId: $pageId
                  replyTo: $replyTo
                  content: $content
                  blockId: $blockId
                  selector: $selector
                  guestName: $guestName
                  guestEmail: $guestEmail
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                  id
                }
              }
            }
          `,
          variables: {
            pageId: this.pageId,
            replyTo: 0,
            content: this.newcomment,
            blockId: this.selectedBlockId || null,
            selector: this.selectedSelector,
            guestName: this.guestName,
            guestEmail: this.guestEmail
          }
        })

        if (_.get(resp, 'data.comments.create.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('common:comments.postSuccess'),
            icon: 'check'
          })

          this.newcomment = ''
          this.selectedText = ''
          this.selectedBlockId = ''
          this.selectedSelector = ''
          await this.fetch()
          this.$nextTick(() => {
            this.$vuetify.goTo(`#comment-post-id-${_.get(resp, 'data.comments.create.id', 0)}`, this.scrollOpts)
          })
        } else {
          throw new Error(_.get(resp, 'data.comments.create.responseResult.message', 'An unexpected error occurred.'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
    },
    /**
     * Show Comment Editing Form
     */
    async editComment (cm) {
      this.$store.commit(`loadingStart`, 'comments-edit')
      this.isBusy = true
      try {
        const results = await this.$apollo.query({
          query: gql`
            query ($id: Int!) {
              comments {
                single(id: $id) {
                  content
                }
              }
            }
          `,
          variables: {
            id: cm.id
          },
          fetchPolicy: 'network-only'
        })
        this.commentEditContent = _.get(results, 'data.comments.single.content', null)
        if (this.commentEditContent === null) {
          throw new Error('Failed to load comment content.')
        }
      } catch (err) {
        console.warn(err)
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.commentEditId = cm.id
      this.isBusy = false
      this.$store.commit(`loadingStop`, 'comments-edit')
    },
    /**
     * Cancel Comment Edit
     */
    editCommentCancel () {
      this.commentEditId = 0
      this.commentEditContent = null
    },
    /**
     * Update Comment with new content
     */
    async updateComment () {
      this.$store.commit(`loadingStart`, 'comments-edit')
      this.isBusy = true
      try {
        if (this.commentEditContent.length < 2) {
          throw new Error(this.$t('common:comments.contentMissingError'))
        }
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $id: Int!
              $content: String!
            ) {
              comments {
                update (
                  id: $id,
                  content: $content
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                  render
                }
              }
            }
          `,
          variables: {
            id: this.commentEditId,
            content: this.commentEditContent
          }
        })

        if (_.get(resp, 'data.comments.update.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('common:comments.updateSuccess'),
            icon: 'check'
          })

          const cm = _.find(this.comments, ['id', this.commentEditId])
          cm.render = _.get(resp, 'data.comments.update.render', '-- Failed to load updated comment --')
          cm.updatedAt = (new Date()).toISOString()

          this.editCommentCancel()
        } else {
          throw new Error(_.get(resp, 'data.comments.delete.responseResult.message', 'An unexpected error occurred.'))
        }
      } catch (err) {
        console.warn(err)
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isBusy = false
      this.$store.commit(`loadingStop`, 'comments-edit')
    },
    /**
     * Show Delete Comment Confirmation Dialog
     */
    deleteCommentConfirm (cm) {
      this.commentToDelete = cm
      this.deleteCommentDialogShown = true
    },
    /**
     * Delete Comment
     */
    async deleteComment () {
      this.$store.commit(`loadingStart`, 'comments-delete')
      this.isBusy = true
      this.deleteCommentDialogShown = false

      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $id: Int!
            ) {
              comments {
                delete (
                  id: $id
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                }
              }
            }
          `,
          variables: {
            id: this.commentToDelete.id
          }
        })

        if (_.get(resp, 'data.comments.delete.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: this.$t('common:comments.deleteSuccess'),
            icon: 'check'
          })

          this.comments = _.reject(this.comments, ['id', this.commentToDelete.id])
        } else {
          throw new Error(_.get(resp, 'data.comments.delete.responseResult.message', 'An unexpected error occurred.'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isBusy = false
      this.$store.commit(`loadingStop`, 'comments-delete')
    },
    /**
     * Resolve Comment Thread
     */
    async resolveComment (cm) {
      this.$store.commit(`loadingStart`, 'comments-resolve')
      this.isBusy = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $id: Int!
              $isResolved: Boolean!
            ) {
              comments {
                setResolved (
                  id: $id,
                  isResolved: $isResolved
                ) {
                  responseResult {
                    succeeded
                    errorCode
                    slug
                    message
                  }
                  affectedIds
                }
              }
            }
          `,
          variables: {
            id: cm.id,
            isResolved: true
          }
        })

        if (_.get(resp, 'data.comments.setResolved.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: 'Comment resolved successfully.',
            icon: 'check'
          })
          await this.fetch(true)
        } else {
          throw new Error(_.get(resp, 'data.comments.setResolved.responseResult.message', 'An unexpected error occurred.'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isBusy = false
      this.$store.commit(`loadingStop`, 'comments-resolve')
    },
    goToComments (focusNewComment = false) {
      this.showFloatingBtn = false
      this.$vuetify.goTo('#discussion', this.scrollOpts)
      if (focusNewComment) {
        this.$nextTick(() => {
          const el = document.querySelector('#discussion-new')
          if (el) el.focus()
        })
      }
    },
    detectTouchDevice () {
      if (typeof window === 'undefined') return false
      if (window.matchMedia) {
        return window.matchMedia('(pointer: coarse)').matches
      }
      return ('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0)
    },
    setupTextSelection () {
      // Listen for text selection on the page content.
      // Avoid reacting during a mouse-drag selection: updating the UI mid-drag can
      // interrupt selection (e.g. by placing an element under the cursor).
      if (!this.shouldEnableMobileLongPress) {
        document.addEventListener('mousedown', this.handleSelectionMouseDown)
        document.addEventListener('mouseup', this.handleSelectionMouseUp)
        document.addEventListener('keyup', this.handleTextSelection)
      } else {
        document.addEventListener('touchstart', this.handleTouchStart, { passive: true })
        document.addEventListener('touchmove', this.handleTouchMove, { passive: true })
        document.addEventListener('touchend', this.handleTouchEnd, { passive: true })
        document.addEventListener('touchcancel', this.handleTouchEnd, { passive: true })
      }
      document.addEventListener('keydown', this.handleGlobalKeyDown)
      document.addEventListener('click', this.handleGlobalClick)
    },
    cleanupTextSelection () {
      document.removeEventListener('mousedown', this.handleSelectionMouseDown)
      document.removeEventListener('mouseup', this.handleSelectionMouseUp)
      document.removeEventListener('keyup', this.handleTextSelection)
      document.removeEventListener('touchstart', this.handleTouchStart)
      document.removeEventListener('touchmove', this.handleTouchMove)
      document.removeEventListener('touchend', this.handleTouchEnd)
      document.removeEventListener('touchcancel', this.handleTouchEnd)
      document.removeEventListener('keydown', this.handleGlobalKeyDown)
      document.removeEventListener('click', this.handleGlobalClick)
    },
    handleTouchStart (e) {
      if (!this.shouldEnableMobileLongPress) return
      if (this.showThreadDialog) return
      const target = e && e.target
      if (!target || !target.closest) return

      const contentArea = target.closest('.contents') || target.closest('.page-content')
      if (!contentArea) return
      if (this.isInteractiveElement(target)) return

      const touch = (e.touches && e.touches[0]) ? e.touches[0] : null
      if (!touch) return

      this.clearLongPress()
      this.longPressStart = { x: touch.clientX, y: touch.clientY }
      this.longPressTarget = target
      this.longPressTimer = setTimeout(() => {
        this.triggerLongPress(e)
      }, 420)
    },
    handleTouchMove (e) {
      if (!this.longPressStart) return
      const touch = (e.touches && e.touches[0]) ? e.touches[0] : null
      if (!touch) return
      const dx = Math.abs(touch.clientX - this.longPressStart.x)
      const dy = Math.abs(touch.clientY - this.longPressStart.y)
      if (dx > 10 || dy > 10) {
        this.clearLongPress()
      }
    },
    handleTouchEnd () {
      this.clearLongPress()
    },
    clearLongPress () {
      if (this.longPressTimer) clearTimeout(this.longPressTimer)
      this.longPressTimer = null
      this.longPressStart = null
      this.longPressTarget = null
      this.longPressFired = false
    },
    isInteractiveElement (el) {
      if (!el || !el.closest) return false
      return Boolean(el.closest('a, button, input, textarea, select, label, .comment-bubble, .contextual-fab-wrapper, .contextual-thread-wrapper'))
    },
    getLongPressAnchorElement (target) {
      if (!target || !target.closest) return null
      return target.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, pre, table, figure') || target
    },
    getBlockAnchorElement (target) {
      if (!target) return null
      let el = target
      if (el.nodeType === Node.TEXT_NODE) el = el.parentElement
      if (!el || !el.closest) return null

      const contentArea = el.closest('.contents') || el.closest('.page-content')
      if (!contentArea) return null

      const block = el.closest('[data-block-id]')
      if (block && contentArea.contains(block)) return block

      return this.getLongPressAnchorElement(el)
    },
    getSelectorForAnchor (el) {
      if (!el) return ''
      const blockId = el.getAttribute && el.getAttribute('data-block-id')
      if (blockId) return `[data-block-id="${escapeAttrValue(blockId)}"]`
      return this.getCSSSelector(el)
    },
    triggerLongPress (e) {
      if (!this.longPressTarget || this.longPressFired) return
      this.longPressFired = true

      const touch = (e.touches && e.touches[0]) ? e.touches[0] : null
      if (!touch) return

      const anchor = this.getBlockAnchorElement(this.longPressTarget)
      const selector = this.getSelectorForAnchor(anchor)
      const blockId = anchor && anchor.getAttribute ? (anchor.getAttribute('data-block-id') || '') : ''

      this.selectedText = ''
      this.selectedBlockId = blockId
      this.selectedSelector = selector
      this.pendingBlockId = blockId
      this.pendingSelector = selector
      this.pendingText = ''

      this.floatingBtnStyle = {
        position: 'fixed',
        top: `${touch.clientY}px`,
        left: `${touch.clientX}px`,
        zIndex: 2200
      }

      const selection = window.getSelection()
      if (selection && selection.removeAllRanges) selection.removeAllRanges()

      this.openNewThread()
      this.clearLongPress()
    },
    handleSelectionMouseDown (e) {
      const target = e && e.target
      if (!target || !target.closest) return
      const contentArea = target.closest('.contents') || target.closest('.page-content')
      if (contentArea) {
        this.isMouseDown = true
      }
    },
    handleSelectionMouseUp () {
      if (this.isMouseDown) {
        this.isMouseDown = false
        this.handleTextSelection()
      }
    },
    handleGlobalClick (e) {
      // Ignore clicks originating from the contextual FAB itself. The FAB click
      // opens the dialog; without this guard (or in cases where propagation
      // isn't fully stopped by the component), it can be treated as an
      // "outside" click and immediately close the thread window.
      const fab = this.$refs.contextualFab
      const fabEl = (fab && fab.$el) ? fab.$el : fab
      if (fabEl && typeof fabEl.contains === 'function' && fabEl.contains(e.target)) {
        return
      }

      if (this.showThreadDialog) {
        const threadWindow = this.$refs.threadWindow
        const el = (threadWindow && threadWindow.$el) ? threadWindow.$el : threadWindow
        if (el && typeof el.contains === 'function' && !el.contains(e.target)) {
          this.closeThreadDialog()
          return
        }
      }

      // If clicking an image in the content area, trigger the floating button
      if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'PICTURE')) {
        const contentArea = e.target.closest('.contents') || e.target.closest('.page-content')
        if (contentArea) {
          const rect = e.target.getBoundingClientRect()
          this.selectedText = '[Image]'
          const anchor = this.getBlockAnchorElement(e.target)
          this.selectedBlockId = anchor && anchor.getAttribute ? (anchor.getAttribute('data-block-id') || '') : ''
          this.selectedSelector = this.getSelectorForAnchor(anchor || e.target)
          this.pendingSelector = this.selectedSelector
          this.pendingBlockId = this.selectedBlockId
          this.pendingText = this.selectedText

          console.log('Image clicked, showing floating button:', { selector: this.selectedSelector })

          this.showFloatingBtn = true
          this.floatingBtnStyle = {
            position: 'fixed',
            top: `${rect.top}px`,
            left: `${rect.right + 5}px`,
            zIndex: 2200
          }
          // Prevent further selection logic from hiding it immediately
          e.stopPropagation()
        }
      }
    },
    handleGlobalKeyDown (e) {
      if (e.key === 'Escape' && this.showThreadDialog) {
        this.closeThreadDialog()
      }
    },
    closeThreadDialog () {
      this.showThreadDialog = false
      this.showFloatingBtn = false
      this.isDragging = false
      this.dragPosition = null
      this.selectedText = ''
      this.selectedBlockId = ''
      this.selectedSelector = ''
      this.pendingSelector = ''
      this.pendingBlockId = ''
      this.pendingText = ''
      this.currentSelector = ''
      this.currentBlockId = ''
      this.currentText = ''
      this.clearActiveSelectionHighlight()
      this.removeSelectionMarkers()
    },
    startDrag (e) {
      this.isDragging = true
      const rect = e.currentTarget.parentElement.getBoundingClientRect()
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.stopDrag)
    },
    onDrag (e) {
      if (!this.isDragging) return
      this.dragPosition = {
        x: e.clientX - this.dragOffset.x,
        y: e.clientY - this.dragOffset.y
      }
    },
    stopDrag () {
      this.isDragging = false
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.stopDrag)
    },
    removeSelectionMarkers () {
      document.querySelectorAll('.active-selection-marker').forEach(el => {
        const parent = el.parentNode
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el)
          parent.removeChild(el)
        }
      })
      // Clean up image selection highlights
      document.querySelectorAll('.selection-is-active').forEach(el => {
        if (el.tagName === 'IMG' || el.tagName === 'PICTURE') {
          el.style.outline = ''
          el.classList.remove('selection-is-active')
        }
      })
    },
    handleTextSelection () {
      if (this.shouldEnableMobileLongPress) return
      // Don't update selection while a thread window is already open
      if (this.showThreadDialog) return
      // Don't change UI mid selection-drag.
      if (this.isMouseDown) return

      const selection = window.getSelection()
      let selectedText = selection.toString().trim()
      let targetNode = null
      let targetRect = null

      // If text selection is empty, check if we've selected an image node directly
      if (selectedText.length === 0 && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        // Check for single image selection
        if (range.startContainer === range.endContainer && range.endOffset - range.startOffset === 1) {
          const node = range.startContainer.childNodes[range.startOffset]
          if (node && (node.tagName === 'IMG' || node.tagName === 'PICTURE' || node.tagName === 'FIGURE')) {
            targetNode = node
            targetRect = node.getBoundingClientRect()
            selectedText = '[Image]'
          }
        }
      }

      if ((selectedText.length > 0 || targetNode) && this.isContextualProvider) {
        const range = selection.getRangeAt(0)

        // Check if selection is inside the page content
        let container = targetNode || range.commonAncestorContainer
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement

        const contentArea = container.closest('.contents') || container.closest('.page-content')
        if (!contentArea) return

        const rects = range.getClientRects()
        const rect = (rects.length > 0) ? rects[rects.length - 1] : (targetRect || container.getBoundingClientRect())

        if (rect) {
          const anchor = this.getBlockAnchorElement(container)
          const blockId = anchor && anchor.getAttribute ? (anchor.getAttribute('data-block-id') || '') : ''
          this.selectedText = selectedText
          this.selectedBlockId = blockId
          this.selectedSelector = this.getSelectorForAnchor(anchor || container)
          this.pendingBlockId = this.selectedBlockId
          this.pendingSelector = this.selectedSelector
          this.pendingText = this.selectedText

          // Position floating button
          this.showFloatingBtn = true
          this.floatingBtnStyle = {
            position: 'fixed',
            top: `${rect.top - 30}px`,
            left: `${rect.right + 5}px`,
            zIndex: 2200
          }
        }
      } else {
        // Hide floating button if no text is selected
        this.showFloatingBtn = false
      }
    },
    getCSSSelector (el) {
      if (el.nodeType === Node.TEXT_NODE) el = el.parentElement
      if (!el || el.tagName === 'HTML') return 'html'

      const path = []
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.tagName.toLowerCase()

        // Stop at content container for more stable selectors
        if (el.classList.contains('contents') || el.classList.contains('page-content')) {
          path.unshift('.' + el.className.split(' ').join('.'))
          break
        }

        if (el.id) {
          // Only use ID if it doesn't look dynamic (e.g. Wiki.js auto-generated IDs)
          if (!/^[0-9-]+$/.test(el.id)) {
            selector += '#' + el.id
            path.unshift(selector)
            break
          }
        }

        let sib = el; let nth = 1
        while ((sib = sib.previousElementSibling)) {
          if (sib.tagName.toLowerCase() === selector) nth++
        }
        if (nth !== 1) selector += ':nth-of-type(' + nth + ')'

        path.unshift(selector)
        el = el.parentElement
      }
      return path.join(' > ')
    },
    highlightComment (comment) {
      if (!comment) return
      this.highlightElement(comment.selector, comment.blockId)
    },
    highlightElement (selector, blockId = null) {
      if (!selector && !blockId) {
        console.warn('highlightElement called with empty selector/blockId')
        return
      }

      console.log('Attempting to highlight context:', { selector, blockId })

      try {
        let element = findCommentElement({ selector, blockId })

        // If not found, try to find by text content as a fallback
        if (!element && selector && selector.includes('nth-of-type')) {
          // Try a simpler version of the selector
          const simpler = selector.split(' > ').pop().split(':')[0]
          console.log('Exact selector failed, trying simpler match:', simpler)
          element = document.querySelector(`.contents ${simpler}`)
        }

        if (element) {
          console.log('Element found, scrolling and highlighting:', element)
          element.style.backgroundColor = 'rgba(255, 235, 59, 0.4)'
          element.style.outline = '3px solid #ffeb3b'
          element.style.borderRadius = '3px'
          element.style.transition = 'all 0.3s ease'

          // Scroll element into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })

          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.style.backgroundColor = ''
            element.style.outline = ''
            element.style.borderRadius = ''
            element.style.transition = ''
          }, 3000)
        } else {
          console.warn('Element STILL not found for selector:', selector)
          this.$store.commit('showNotification', {
            style: 'info',
            message: 'Could not locate the original text on this page.',
            icon: 'information'
          })
        }
      } catch (e) {
        console.warn('Could not highlight element:', selector, e)
      }
    },
    getInitials (name) {
      const nameParts = (name || 'Unknown').toUpperCase().split(' ')
      let initials = _.head(nameParts).charAt(0)
      if (nameParts.length > 1) {
        initials += _.last(nameParts).charAt(0)
      }
      return initials
    },
    openNewThread () {
      console.log('openNewThread called. Selector:', this.selectedSelector || this.pendingSelector, 'Text:', this.selectedText || this.pendingText)
      this.isNewThread = true
      this.activeThread = null
      this.newThreadContent = ''

      this.currentSelector = this.selectedSelector || this.pendingSelector || ''
      this.currentBlockId = this.selectedBlockId || this.pendingBlockId || ''
      this.currentText = this.selectedText || this.pendingText || ''

      // Set dialog to true early to prevent selection handlers from clearing our data
      this.showThreadDialog = true
      this.showFloatingBtn = false

      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)

        try {
          // If it's a simple selection within one element, surround it
          if (range.startContainer === range.endContainer) {
            // Check if it's text or something else
            if (range.startContainer.nodeType === Node.TEXT_NODE) {
              const marker = document.createElement('span')
              marker.className = 'active-selection-marker'
              marker.style.backgroundColor = 'rgba(144, 164, 174, 0.4)'
              marker.style.boxShadow = '0 0 0 2px rgba(144, 164, 174, 0.6)'
              marker.style.borderRadius = '3px'
              marker.style.padding = '2px 0'
              range.surroundContents(marker)
            } else {
              // It's an element (like an image)
              const node = range.startContainer.childNodes[range.startOffset]
              if (node && node.nodeType === Node.ELEMENT_NODE) {
                node.classList.add('selection-is-active')
                node.style.outline = '3px solid rgba(144, 164, 174, 0.6)'
                node.style.borderRadius = '4px'
              }
            }
          } else {
            // Complex selection across nodes - Collect nodes first to avoid infinite loops during DOM modification
            const common = range.commonAncestorContainer
            const walker = document.createTreeWalker(
              common.nodeType === Node.ELEMENT_NODE ? common : common.parentElement,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  if (selection.containsNode(node, true)) return NodeFilter.FILTER_ACCEPT
                  return NodeFilter.FILTER_REJECT
                }
              },
              false
            )

            const nodesToWrap = []
            let currentNode
            while ((currentNode = walker.nextNode())) {
              nodesToWrap.push(currentNode)
            }

            nodesToWrap.forEach(node => {
              const marker = document.createElement('span')
              marker.className = 'active-selection-marker'
              marker.style.backgroundColor = 'rgba(144, 164, 174, 0.4)'

              const nodeRange = document.createRange()
              if (node === range.startContainer) {
                nodeRange.setStart(node, range.startOffset)
                nodeRange.setEnd(node, node.length)
              } else if (node === range.endContainer) {
                nodeRange.setStart(node, 0)
                nodeRange.setEnd(node, range.endOffset)
              } else {
                nodeRange.selectNodeContents(node)
              }

              try {
                nodeRange.surroundContents(marker)
              } catch (e) {
                console.warn('Could not surround node with marker:', e)
              }
            })

            if (nodesToWrap.length === 0) {
              this.applyActiveSelectionHighlight(this.currentSelector)
            }
          }
        } catch (e) {
          console.warn('Could not surround selection with markers:', e)
          this.applyActiveSelectionHighlight(this.currentSelector)
        }
      } else {
        this.applyActiveSelectionHighlight(this.currentSelector)
      }

      this.$nextTick(() => {
        const el = document.querySelector('.thread-window-textarea textarea')
        if (el) {
          el.focus({ preventScroll: true })
        }
      })
    },
    applyActiveSelectionHighlight (selector) {
      if (!selector) return
      // If a specific text selection exists, we should probably not highlight the whole element
      // as a fallback unless explicitly requested.
      // But for NEW selections that failed to surround, it's still useful.
      try {
        const el = document.querySelector(selector)
        if (el) {
          // Check if it's a large block element
          const isBlock = ['P', 'DIV', 'SECTION', 'ARTICLE', 'UL', 'OL', 'LI'].includes(el.tagName)

          el.classList.add('selection-is-active')
          el.style.backgroundColor = isBlock ? 'rgba(144, 164, 174, 0.1)' : 'rgba(144, 164, 174, 0.3)'
          el.style.boxShadow = isBlock ? '' : '0 0 0 2px rgba(144, 164, 174, 0.5)'
          el.style.borderRadius = '3px'
        }
      } catch (e) {}
    },
    clearActiveSelectionHighlight () {
      document.querySelectorAll('.selection-is-active').forEach(el => {
        el.classList.remove('selection-is-active')
        el.style.boxShadow = ''
        el.style.borderRadius = el.classList.contains('text-highlight-marker') ? '2px' : ''
        el.style.backgroundColor = el.classList.contains('text-highlight-marker') ? 'rgba(144, 164, 174, 0.15)' : ''
      })
    },
    openExistingThread (comment) {
      this.isNewThread = false
      this.activeThread = comment
      this.newThreadContent = ''
      this.currentSelector = comment.selector || (comment.blockId ? `[data-block-id="${escapeAttrValue(comment.blockId)}"]` : '')
      this.currentBlockId = comment.blockId || ''
      this.currentText = ''
      this.showThreadDialog = true

      // Try to find specific marker span first
      const marker = document.querySelector(`.text-highlight-marker[data-comment-id="${comment.id}"]`)
      if (marker) {
        marker.classList.add('selection-is-active')
        marker.style.backgroundColor = 'rgba(144, 164, 174, 0.4)'
        marker.style.boxShadow = '0 0 0 2px rgba(144, 164, 174, 0.6)'
        marker.style.borderRadius = '3px'
      } else {
        // Fallback to block-level highlight when exact selected text is unavailable (e.g. different locale).
        this.applyActiveSelectionHighlight(this.currentSelector)
      }

      this.$nextTick(() => {
        const el = document.querySelector('.thread-window-textarea textarea')
        if (el) {
          el.focus({ preventScroll: true })
        }
      })
    },
    async submitThreadComment () {
      if (!this.isAuthenticated && this.isNewThread) {
        this.$store.commit('showNotification', {
          style: 'blue-grey',
          message: 'You need to be logged in to comment - [Create a free account] or [Login]',
          icon: 'information'
        })
        return
      }
      if (this.newThreadContent.trim().length < 2) return

      // Replies should not carry context anchors; only root contextual comments do.
      const selectorToSend = this.isNewThread ?
        (this.currentSelector || this.selectedSelector || this.pendingSelector || null) :
        null
      const blockIdToSend = this.isNewThread ?
        (this.currentBlockId || this.selectedBlockId || this.pendingBlockId || null) :
        null

      const textToSend = this.isNewThread ?
        (this.currentText || this.selectedText || this.pendingText || null) :
        null

      console.log('Submitting comment. isNewThread:', this.isNewThread, 'blockId:', blockIdToSend, 'selector:', selectorToSend, 'text:', textToSend)

      this.isBusy = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
          mutation ($pageId: Int!, $replyTo: Int, $content: String!, $blockId: String, $selector: String, $selectedText: String) {
            comments {
              create (pageId: $pageId, replyTo: $replyTo, content: $content, blockId: $blockId, selector: $selector, selectedText: $selectedText) {
                responseResult { succeeded message }
                id
              }
            }
          }
        `,
          variables: {
            pageId: this.pageId,
            replyTo: this.isNewThread ? 0 : this.activeThread.id,
            content: this.newThreadContent,
            blockId: blockIdToSend,
            selector: selectorToSend,
            selectedText: textToSend
          }
        })

        if (_.get(resp, 'data.comments.create.responseResult.succeeded', false)) {
          console.log('Comment created successfully. ID:', _.get(resp, 'data.comments.create.id'))
          this.newThreadContent = ''
          this.closeThreadDialog()
          await this.fetch()
        } else {
          console.error('Comment creation failed:', _.get(resp, 'data.comments.create.responseResult.message'))
        }
      } catch (err) {
        console.error('Mutation error:', err)
        this.$store.commit('showNotification', { style: 'red', message: err.message, icon: 'alert' })
      }
      this.isBusy = false
    },
    handleThreadEnter (e) {
      if (e.shiftKey) return
      e.preventDefault()
      this.submitThreadComment()
    },
    handleMainEnter (e) {
      if (e.shiftKey) return
      e.preventDefault()
      this.postComment()
    },
    handleReplyEnter (e) {
      if (e.shiftKey) return
      e.preventDefault()
      this.postReply()
    },
    handleEditEnter (e) {
      if (e.shiftKey) return
      e.preventDefault()
      this.updateComment()
    },
    processContextualComments () {
      // Clear existing bubbles and highlights
      document.querySelectorAll('.comment-bubble').forEach(el => el.remove())
      document.querySelectorAll('.comment-highlight').forEach(el => {
        el.classList.remove('comment-highlight')
        el.style.backgroundColor = ''
        el.removeAttribute('data-ui-id')
      })
      document.querySelectorAll('.text-highlight-marker').forEach(el => {
        const parent = el.parentNode
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el)
          parent.removeChild(el)
        }
      })

      // Group root comments by anchor
      const contextualRoots = this.comments.filter(c => (c.blockId || c.selector) && (!c.replyTo || c.replyTo === 0))

      contextualRoots.forEach(comment => {
        try {
          const el = findCommentElement(comment)
          if (el) {
            // Apply precise highlight if text is available
            if (comment.selectedText) {
              const matched = this.highlightTextWithinElement(el, comment.selectedText, comment.id)
              if (!matched) {
                el.classList.add('comment-highlight')
                el.style.backgroundColor = 'rgba(144, 164, 174, 0.15)'
                el.style.borderRadius = '3px'
                el.setAttribute('data-ui-id', 'LongevidenceInlineCommentHighlight')
              }
            } else {
              // Apply pale highlight
              el.classList.add('comment-highlight')
              el.style.backgroundColor = 'rgba(144, 164, 174, 0.15)'
              el.style.borderRadius = '3px'
              el.setAttribute('data-ui-id', 'LongevidenceInlineCommentHighlight')
            }

            // Create bubble icon
            const bubble = document.createElement('div')
            bubble.className = 'comment-bubble'
            bubble.setAttribute('data-comment-id', comment.id)
            bubble.setAttribute('data-ui-id', 'LongevidenceInlineCommentBubble')
            bubble.innerHTML = '<i class="v-icon notranslate mdi mdi-comment-text theme--light" style="font-size: 18px; color: #607D8B;"></i>'
            bubble.style.position = 'absolute'
            bubble.style.cursor = 'pointer'
            // Keep below Vuetify modal scrims (e.g. search overlay), but above page content.
            bubble.style.zIndex = '1800'

            // Position bubble to the right of the element
            const pagePos = getElementPagePositionFromElement(el)
            const viewportPos = getElementViewportPositionFromElement(el)
            if (!pagePos || !viewportPos) return

            bubble.style.top = `${pagePos.top}px`
            bubble.style.left = `${pagePos.right + 5}px`

            bubble.onclick = (e) => {
              e.stopPropagation()
              this.floatingBtnStyle = {
                top: `${viewportPos.top}px`,
                left: `${viewportPos.right}px`
              }
              this.openExistingThread(comment)
            }

            document.body.appendChild(bubble)
          }
        } catch (e) {
          console.warn('Could not process contextual comment:', comment.id, e)
        }
      })
    },
    highlightTextWithinElement (element, text, commentId) {
      if (!text || !element) return false
      const cleanText = text.trim()
      if (cleanText.length === 0) return false

      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false)
      let node
      while ((node = walker.nextNode())) {
        const nodeValue = node.nodeValue || ''
        const index = nodeValue.indexOf(cleanText)
        if (index !== -1) {
          const range = document.createRange()
          range.setStart(node, index)
          range.setEnd(node, index + cleanText.length)

          const marker = document.createElement('span')
          marker.className = 'text-highlight-marker'
          marker.setAttribute('data-comment-id', commentId)
          marker.setAttribute('data-ui-id', 'LongevidenceInlineCommentHighlight')
          marker.style.backgroundColor = 'rgba(144, 164, 174, 0.15)'
          marker.style.borderRadius = '2px'

          try {
            range.surroundContents(marker)
          } catch (e) {
            console.warn('Could not surround text with marker:', cleanText, e)
            return false
          }
          return true
        }
      }
      return false
    }
  },
  mounted () {
    this.fetch(true)
    this.isTouchDevice = this.detectTouchDevice()
    if (this.isContextualProvider) {
      this.setupTextSelection()
    }
    window.addEventListener('resize', this.processContextualComments)
  },
  beforeDestroy () {
    if (this.isContextualProvider) {
      this.cleanupTextSelection()
    }
    this.clearLongPress()
    window.removeEventListener('resize', this.processContextualComments)
  }
}
</script>

<style lang="scss">
.contextual-fab-dialog { pointer-events: none; }
.contextual-thread-dialog { pointer-events: auto; }

.contextual-fab-wrapper,
.contextual-thread-wrapper {
  pointer-events: auto;
}

.contextual-fab-wrapper {
  // Don't let the wrapper block selection-drag; only the button itself should be clickable.
  pointer-events: none;
}

.contextual-fab-wrapper .floating-comment-btn {
  pointer-events: auto;
}

.contextual-fab-dialog,
.contextual-fab-menu,
.contextual-thread-dialog {
  // Ensure the dialog wrapper doesn't introduce layout, shadows, or fonts
  // when we position the actual UI ourselves via inline styles.
  box-shadow: none !important;
  background: transparent !important;

  // Vuetify's dialog content wrapper can still affect layout/appearance.
  &,
  .v-dialog__content,
  .v-menu__content,
  .v-overlay__content,
  .v-overlay__scrim {
    box-shadow: none !important;
    background: transparent !important;
  }

  .v-dialog {
    margin: 0;
    box-shadow: none !important;
    background: transparent !important;
    max-width: none;
    width: auto;
  }
}

.floating-comment-btn {
  transition: transform 0.2s ease, opacity 0.2s ease;
  z-index: 2200 !important;
  &:hover {
    transform: scale(1.2);
  }
}

.floating-thread-window {
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;

  .thread-content {
    flex: 1;
    overflow-y: auto;
    background-color: #f5f7f9;
  }

  .thread-message {
    background-color: white;
    padding: 8px;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  @at-root .theme--dark & {
    background-color: #1e1e1e;
    .thread-content { background-color: #121212; }
    .thread-message { background-color: #1e1e1e; }
  }
}

.comment-bubble {
  background-color: white;
  z-index: 1800;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.15);
    background-color: #ECEFF1;
  }

  @at-root .theme--dark & {
    background-color: #37474F;
    &:hover { background-color: #455A64; }
  }
}

.active-selection-marker {
  transition: all 0.3s ease;
  display: inline;
}

.text-highlight-marker {
  transition: all 0.3s ease;
  display: inline;
}

.comment-highlight {
  transition: all 0.3s ease;
}

.selection-is-active {
  transition: all 0.3s ease;
}

.comments-post {
  position: relative;

  &:hover {
    .comments-post-actions {
      opacity: 1;
    }
  }

  &-actions {
    position: absolute;
    top: 16px;
    right: 16px;
    opacity: 0;
    transition: opacity .4s ease;
  }

  &-content {
    > p:first-child {
      padding-top: 0;
    }

    p {
      padding-top: 1rem;
      margin-bottom: 0;
    }

    img {
      max-width: 100%;
      border-radius: 5px;
    }

    code {
      background-color: rgba(mc('pink', '500'), .1);
      box-shadow: none;
    }

    pre > code {
      margin-top: 1rem;
      padding: 12px;
      background-color: #111;
      box-shadow: none;
      border-radius: 5px;
      width: 100%;
      color: #FFF;
      font-weight: 400;
      font-size: .85rem;
      font-family: Roboto Mono, monospace;
    }
  }
}

.comment-replies {
  border-left: 3px solid rgba(144, 164, 174, 0.2);
  padding-left: 16px;

  .reply-item {
    background-color: rgba(144, 164, 174, 0.03);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;

    &:hover {
      background-color: rgba(144, 164, 174, 0.06);
    }
  }
}

.comment-reply-form {
  background-color: rgba(144, 164, 174, 0.05);
  border-radius: 8px;
  padding: 12px;
  border: 1px dashed rgba(144, 164, 174, 0.3);
}

.comment-actions-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: rgba(0, 0, 0, 0.6);
}

.comment-action-btn {
  text-transform: none;
  letter-spacing: normal;
  font-weight: 600;
}

.comment-action-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(144, 164, 174, 0.18);
  color: rgba(0, 0, 0, 0.7);
}

.theme--dark {
  .comment-actions-row {
    color: rgba(255, 255, 255, 0.7);
  }
  .comment-action-count {
    background: rgba(144, 164, 174, 0.22);
    color: rgba(255, 255, 255, 0.8);
  }
}
</style>
