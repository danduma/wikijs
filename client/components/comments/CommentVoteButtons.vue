<template lang="pug">
  .comment-votes.d-inline-flex.align-center
    v-btn.comment-vote-btn(
      icon
      x-small
      :disabled='disabled || isBusy'
      :color='localUserVote === `upvote` ? `orange darken-2` : `blue-grey`'
      title='Upvote'
      @click='onUpvote'
    )
      v-icon(small) mdi-arrow-up-bold-outline
    span.comment-score.px-2 {{ netScore }}
    v-btn.comment-vote-btn(
      icon
      x-small
      :disabled='disabled || isBusy'
      :color='localUserVote === `downvote` ? `indigo darken-2` : `blue-grey`'
      title='Downvote'
      @click='onDownvote'
    )
      v-icon(small) mdi-arrow-down-bold-outline
</template>

<script>
import gql from 'graphql-tag'

export default {
  props: {
    commentId: {
      type: Number,
      required: true
    },
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    },
    userVote: {
      type: String,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      isBusy: false,
      localUpvotes: this.upvotes,
      localDownvotes: this.downvotes,
      localUserVote: this.userVote
    }
  },
  computed: {
    netScore () {
      return (this.localUpvotes || 0) - (this.localDownvotes || 0)
    }
  },
  watch: {
    upvotes (val) { this.localUpvotes = val },
    downvotes (val) { this.localDownvotes = val },
    userVote (val) { this.localUserVote = val }
  },
  methods: {
    computeOptimistic (nextVoteType) {
      const prev = {
        upvotes: this.localUpvotes,
        downvotes: this.localDownvotes,
        userVote: this.localUserVote
      }

      let upvotes = this.localUpvotes
      let downvotes = this.localDownvotes
      let userVote = this.localUserVote

      // nextVoteType: 'upvote' | 'downvote' | null (remove)
      if (nextVoteType === null) {
        if (userVote === 'upvote') upvotes = Math.max(0, upvotes - 1)
        if (userVote === 'downvote') downvotes = Math.max(0, downvotes - 1)
        userVote = null
      } else if (nextVoteType === 'upvote') {
        if (userVote === 'upvote') {
          // toggle off
          upvotes = Math.max(0, upvotes - 1)
          userVote = null
        } else {
          if (userVote === 'downvote') downvotes = Math.max(0, downvotes - 1)
          upvotes += 1
          userVote = 'upvote'
        }
      } else if (nextVoteType === 'downvote') {
        if (userVote === 'downvote') {
          downvotes = Math.max(0, downvotes - 1)
          userVote = null
        } else {
          if (userVote === 'upvote') upvotes = Math.max(0, upvotes - 1)
          downvotes += 1
          userVote = 'downvote'
        }
      }

      return {
        prev,
        next: { upvotes, downvotes, userVote }
      }
    },
    async applyServerResult (payload) {
      const result = payload?.data?.comments
      const vote = result?.vote || result?.removeVote
      const succeeded = vote?.responseResult?.succeeded
      if (!succeeded) {
        throw new Error(vote?.responseResult?.message || 'An unexpected error occurred.')
      }

      const upvotes = vote?.voteCounts?.upvotes ?? 0
      const downvotes = vote?.voteCounts?.downvotes ?? 0
      const userVote = vote?.userVote ?? null

      this.localUpvotes = upvotes
      this.localDownvotes = downvotes
      this.localUserVote = userVote

      this.$emit('vote-changed', {
        commentId: this.commentId,
        upvotes,
        downvotes,
        userVote
      })
    },
    async onUpvote () {
      if (this.disabled || this.isBusy) return

      const nextVoteType = (this.localUserVote === 'upvote') ? null : 'upvote'
      const { prev, next } = this.computeOptimistic(nextVoteType)

      this.isBusy = true
      this.localUpvotes = next.upvotes
      this.localDownvotes = next.downvotes
      this.localUserVote = next.userVote

      try {
        if (nextVoteType === null) {
          const resp = await this.$apollo.mutate({
            mutation: gql`
              mutation ($commentId: Int!) {
                comments {
                  removeVote(commentId: $commentId) {
                    responseResult { succeeded message }
                    voteCounts { upvotes downvotes }
                    userVote
                  }
                }
              }
            `,
            variables: { commentId: this.commentId }
          })
          await this.applyServerResult(resp)
        } else {
          const resp = await this.$apollo.mutate({
            mutation: gql`
              mutation ($commentId: Int!, $voteType: CommentVoteType!) {
                comments {
                  vote(commentId: $commentId, voteType: $voteType) {
                    responseResult { succeeded message }
                    voteCounts { upvotes downvotes }
                    userVote
                  }
                }
              }
            `,
            variables: { commentId: this.commentId, voteType: nextVoteType }
          })
          await this.applyServerResult(resp)
        }
      } catch (err) {
        this.localUpvotes = prev.upvotes
        this.localDownvotes = prev.downvotes
        this.localUserVote = prev.userVote
        this.$store?.commit?.('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isBusy = false
    },
    async onDownvote () {
      if (this.disabled || this.isBusy) return

      const nextVoteType = (this.localUserVote === 'downvote') ? null : 'downvote'
      const { prev, next } = this.computeOptimistic(nextVoteType)

      this.isBusy = true
      this.localUpvotes = next.upvotes
      this.localDownvotes = next.downvotes
      this.localUserVote = next.userVote

      try {
        if (nextVoteType === null) {
          const resp = await this.$apollo.mutate({
            mutation: gql`
              mutation ($commentId: Int!) {
                comments {
                  removeVote(commentId: $commentId) {
                    responseResult { succeeded message }
                    voteCounts { upvotes downvotes }
                    userVote
                  }
                }
              }
            `,
            variables: { commentId: this.commentId }
          })
          await this.applyServerResult(resp)
        } else {
          const resp = await this.$apollo.mutate({
            mutation: gql`
              mutation ($commentId: Int!, $voteType: CommentVoteType!) {
                comments {
                  vote(commentId: $commentId, voteType: $voteType) {
                    responseResult { succeeded message }
                    voteCounts { upvotes downvotes }
                    userVote
                  }
                }
              }
            `,
            variables: { commentId: this.commentId, voteType: nextVoteType }
          })
          await this.applyServerResult(resp)
        }
      } catch (err) {
        this.localUpvotes = prev.upvotes
        this.localDownvotes = prev.downvotes
        this.localUserVote = prev.userVote
        this.$store?.commit?.('showNotification', {
          style: 'red',
          message: err.message,
          icon: 'alert'
        })
      }
      this.isBusy = false
    }
  }
}
</script>

<style lang="scss" scoped>
.comment-vote-btn {
  min-width: 24px;
}

.comment-score {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.theme--dark {
  .comment-score {
    color: rgba(255, 255, 255, 0.75);
  }
}
</style>
