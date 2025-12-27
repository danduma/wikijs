<template lang="pug">
  div(v-intersect.once='onIntersect')
    v-btn.floating-comment-btn(
      v-if='showFloatingBtn && isContextualProvider'
      fab
      x-small
      color='primary'
      :style='floatingBtnStyle'
      @click='openNewThread'
    )
      v-icon(small) mdi-comment-plus

    //- Floating Thread Window
    v-card.floating-thread-window.elevation-10(
      v-if='showThreadDialog'
      :style='threadWindowStyle'
    )
      v-toolbar(color='primary', dark, dense, flat)
        v-toolbar-title.body-1 {{ isNewThread ? "New Comment" : "Comment Thread" }}
        v-spacer
        v-btn(icon, small, @click='showThreadDialog = false')
          v-icon(small) mdi-close
      
      .thread-content.pa-3
        //- Existing thread messages
        template(v-if='!isNewThread')
          .thread-message.mb-4(v-for='msg in activeThreadMessages' :key='msg.id')
            .d-flex.align-center.mb-1
              v-avatar(color='blue-grey', size='24')
                span.white--text.caption {{ getInitials(msg.authorName) }}
              .caption.ml-2.font-weight-bold {{ msg.authorName }}
              v-spacer
              .overline.grey--text {{ msg.createdAt | moment('from') }}
            .body-2.pl-8(v-html='msg.render')
          v-divider.my-3

        //- Reply/New Comment Box
        v-textarea(
          outlined
          flat
          dense
          rows='3'
          hide-details
          v-model='newThreadContent'
          :placeholder='isNewThread ? "Write your comment..." : "Write a reply..."'
          autofocus
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

    .selected-text-preview.mb-3(v-if='selectedText && isContextualProvider && !showThreadDialog', style='position: relative;')
      .caption.grey--text.mb-1 Replying to:
      blockquote.pa-3(:class='$vuetify.theme.dark ? `grey darken-4` : `grey lighten-4`', style='border-left: 4px solid #90A4AE; position: relative;')
        em {{ selectedText }}
        v-btn(icon, x-small, @click='selectedText = ""; selectedSelector = ""; showFloatingBtn = false', style='position: absolute; top: 4px; right: 4px;')
          v-icon(small) mdi-close
    v-textarea#discussion-new(
      outlined
      flat
      :placeholder='selectedText ? `Replying to: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? "..." : ""}"` : $t(`common:comments.newPlaceholder`)'
      auto-grow
      dense
      rows='3'
      hide-details
      v-model='newcomment'
      color='blue-grey darken-2'
      :background-color='$vuetify.theme.dark ? `grey darken-5` : `white`'
      v-if='permissions.write'
      :aria-label='$t(`common:comments.fieldContent`)'
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
      v-else-if='bottomComments && bottomComments.length > 0'
      )
      v-timeline-item.comments-post(
        color='pink darken-4'
        large
        v-for='cm of bottomComments'
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
              v-icon(small, @click='deleteCommentConfirm(cm)') mdi-delete
            .comments-post-name.caption: strong {{cm.authorName}}
            .comments-post-date.overline.grey--text {{cm.createdAt | moment('from') }} #[em(v-if='cm.createdAt !== cm.updatedAt') - {{$t('common:comments.modified', { reldate: $options.filters.moment(cm.updatedAt, 'from') })}}]
            .comments-post-context.caption.grey--text(v-if='cm.selector && isContextualProvider')
              v-icon(small, @click='highlightElement(cm.selector)', color='primary') mdi-target
              span.ml-1(style='cursor: pointer;', @click='highlightElement(cm.selector)') View Context
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

export default {
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
      selectedText: '',
      selectedSelector: '',
      isContextualProvider: false,
      showFloatingBtn: false,
      floatingBtnStyle: {
        top: '0px',
        left: '0px'
      },
      showThreadDialog: false,
      activeThread: null,
      threadReplies: [],
      newThreadContent: '',
      isNewThread: false,
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
    bottomComments () {
      return this.comments.filter(c => !c.replyTo || c.replyTo === 0)
    },
    activeThreadMessages () {
      if (!this.activeThread) return []
      const root = this.comments.find(c => c.id === this.activeThread.id)
      const replies = this.comments.filter(c => c.replyTo === this.activeThread.id)
      return root ? [root, ...replies] : replies
    },
    threadWindowStyle () {
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
        zIndex: 1001,
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
    commentProviders: {
      query: gql`
        query {
          comments {
            providers {
              key
              isEnabled
            }
          }
        }
      `,
      manual: true,
      result ({ data }) {
        if (data && data.comments && data.comments.providers) {
          const providers = data.comments.providers
          const enabledProvider = providers.find(p => p.isEnabled)
          this.isContextualProvider = enabledProvider && enabledProvider.key === 'contextual'
        }
      },
      fetchPolicy: 'network-only'
    }
  },
  methods: {
    onIntersect (entries, observer, isIntersecting) {
      if (isIntersecting) {
        this.fetch(true)
      }
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
                  selector
                  replyTo
                  authorName
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
          return c
        })

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
              $selector: String
              $guestName: String
              $guestEmail: String
            ) {
              comments {
                create (
                  pageId: $pageId
                  replyTo: $replyTo
                  content: $content
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
    setupTextSelection () {
      console.log('Comments: Setting up text selection listeners')
      // Listen for text selection on the page content
      document.addEventListener('selectionchange', this.handleTextSelection)
      document.addEventListener('mouseup', this.handleTextSelection)
      document.addEventListener('keyup', this.handleTextSelection)
    },
    cleanupTextSelection () {
      document.removeEventListener('selectionchange', this.handleTextSelection)
      document.removeEventListener('mouseup', this.handleTextSelection)
      document.removeEventListener('keyup', this.handleTextSelection)
    },
    handleTextSelection () {
      const selection = window.getSelection()
      const selectedText = selection.toString().trim()

      if (selectedText.length > 0 && this.isContextualProvider) {
        const range = selection.getRangeAt(0)
        
        // Check if selection is inside the page content (to avoid triggering on selecting text in comments)
        let container = range.commonAncestorContainer
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement
        if (!container.closest('.contents') && !container.closest('.page-content')) return

        const rects = range.getClientRects()
        if (rects.length > 0) {
          const lastRect = rects[rects.length - 1]

          // Get the CSS selector for the selected element
          this.selectedText = selectedText
          this.selectedSelector = this.getCSSSelector(range.commonAncestorContainer)

          // Position floating button
          this.showFloatingBtn = true
          this.floatingBtnStyle = {
            position: 'fixed',
            top: `${lastRect.top - 30}px`,
            left: `${lastRect.right + 5}px`,
            zIndex: 1000
          }
        }
      } else {
        // Hide floating button if no text is selected, but keep selectedText for the comment box
        this.showFloatingBtn = false
      }
    },
    getCSSSelector (el) {
      if (el.nodeType === Node.TEXT_NODE) el = el.parentElement
      if (!el || el.tagName === 'HTML') return 'html'
      
      const path = []
      while (el && el.nodeType === Node.ELEMENT_NODE) {
        let selector = el.tagName.toLowerCase()
        if (el.id) {
          selector += '#' + el.id
          path.unshift(selector)
          break
        } else {
          let sib = el, nth = 1
          while (sib = sib.previousElementSibling) {
            if (sib.tagName.toLowerCase() === selector) nth++
          }
          if (nth !== 1) selector += ':nth-of-type(' + nth + ')'
        }
        path.unshift(selector)
        el = el.parentElement
      }
      return path.join(' > ')
    },
    highlightElement (selector) {
      if (!selector) return

      try {
        const element = document.querySelector(selector)
        if (element) {
          element.style.backgroundColor = 'rgba(255, 235, 59, 0.3)'
          element.style.border = '2px solid #ffeb3b'
          element.style.borderRadius = '3px'
          element.style.transition = 'all 0.3s ease'

          // Scroll element into view
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })

          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.style.backgroundColor = ''
            element.style.border = ''
            element.style.borderRadius = ''
            element.style.transition = ''
          }, 3000)
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
      this.isNewThread = true
      this.activeThread = null
      this.newThreadContent = ''
      this.showThreadDialog = true
      this.showFloatingBtn = false
    },
    openExistingThread (comment) {
      this.isNewThread = false
      this.activeThread = comment
      this.newThreadContent = ''
      this.showThreadDialog = true
    },
    async submitThreadComment () {
      if (this.newThreadContent.trim().length < 2) return

      console.log('Submitting comment. isNewThread:', this.isNewThread, 'selector:', this.isNewThread ? this.selectedSelector : this.activeThread.selector)

      this.isBusy = true
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation ($pageId: Int!, $replyTo: Int, $content: String!, $selector: String) {
              comments {
                create (pageId: $pageId, replyTo: $replyTo, content: $content, selector: $selector) {
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
            selector: this.isNewThread ? (this.selectedSelector || null) : (this.activeThread.selector || null)
          }
        })

        if (_.get(resp, 'data.comments.create.responseResult.succeeded', false)) {
          console.log('Comment created successfully. ID:', _.get(resp, 'data.comments.create.id'))
          this.newThreadContent = ''
          if (this.isNewThread) {
            this.showThreadDialog = false
            this.selectedText = ''
            this.selectedSelector = ''
          }
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
    processContextualComments () {
      // Clear existing bubbles and highlights
      document.querySelectorAll('.comment-bubble').forEach(el => el.remove())
      document.querySelectorAll('.comment-highlight').forEach(el => {
        el.classList.remove('comment-highlight')
        el.style.backgroundColor = ''
      })

      // Group root comments by selector
      const contextualRoots = this.comments.filter(c => c.selector && (!c.replyTo || c.replyTo === 0))

      contextualRoots.forEach(comment => {
        try {
          const el = document.querySelector(comment.selector)
          if (el) {
            // Apply pale highlight
            el.classList.add('comment-highlight')
            el.style.backgroundColor = 'rgba(144, 164, 174, 0.15)'
            el.style.borderRadius = '3px'

            // Create bubble icon
            const bubble = document.createElement('div')
            bubble.className = 'comment-bubble'
            bubble.innerHTML = '<i class="v-icon notranslate mdi mdi-comment-text theme--light" style="font-size: 18px; color: #607D8B;"></i>'
            bubble.style.position = 'absolute'
            bubble.style.cursor = 'pointer'
            bubble.style.zIndex = '5'
            
            // Position bubble to the right of the element
            // We use offsetTop/offsetLeft relative to document to handle absolute positioning
            const rect = el.getBoundingClientRect()
            const scrollX = window.scrollX || window.pageXOffset
            const scrollY = window.scrollY || window.pageYOffset
            
            // We want it at the last line. getClientRects() gives us individual lines for multi-line elements
            const rects = el.getClientRects()
            const lastRect = rects.length > 0 ? rects[rects.length - 1] : rect
            
            bubble.style.top = `${lastRect.top + scrollY}px`
            bubble.style.left = `${lastRect.right + scrollX + 5}px`
            
            bubble.onclick = (e) => {
              e.stopPropagation()
              this.floatingBtnStyle = {
                top: `${lastRect.top}px`,
                left: `${lastRect.right}px`
              }
              this.openExistingThread(comment)
            }
            
            document.body.appendChild(bubble)
          }
        } catch (e) {
          console.warn('Could not process contextual comment:', comment.id, e)
        }
      })
    }
  },
  mounted () {
    if (this.isContextualProvider) {
      this.setupTextSelection()
    }
    window.addEventListener('resize', this.processContextualComments)
  },
  beforeDestroy () {
    if (this.isContextualProvider) {
      this.cleanupTextSelection()
    }
    window.removeEventListener('resize', this.processContextualComments)
  }
}
</script>

<style lang="scss">
.floating-comment-btn {
  transition: transform 0.2s ease, opacity 0.2s ease;
  &:hover {
    transform: scale(1.2);
  }
}

.floating-thread-window {
  position: fixed;
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
</style>
