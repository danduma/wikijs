<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          v-icon.mr-3.primary--text(size='64') mdi-ticket-account
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft Page Request Service
            .subtitle-1.grey--text.animated.fadeInLeft Configuration for the Evergreen Page Request service
          v-spacer
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span {{$t('common:actions.apply')}}
        v-form.pt-3
          v-layout(row wrap)
            v-flex(lg6 xs12)
              v-card.animated.fadeInUp
                v-toolbar(color='primary', dark, dense, flat)
                  v-toolbar-title.subtitle-1 Service Configuration
                v-card-text
                  v-text-field(
                    outlined
                    label='Evergreen API URL'
                    v-model='config.pageRequestEvergreenApiUrl'
                    prepend-icon='mdi-link'
                    hint='Base URL for the Evergreen API service'
                    persistent-hint
                    )
                  v-text-field.mt-3(
                    outlined
                    label='Evergreen API Key'
                    v-model='config.pageRequestEvergreenApiKey'
                    prepend-icon='mdi-key'
                    hint='API Key for authentication'
                    persistent-hint
                    type='password'
                    )
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'

export default {
  data() {
    return {
      config: {
        pageRequestEvergreenApiUrl: '',
        pageRequestEvergreenApiKey: ''
      }
    }
  },
  methods: {
    async save () {
      try {
        await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $pageRequestEvergreenApiUrl: String
              $pageRequestEvergreenApiKey: String
            ) {
              site {
                updateConfig(
                  pageRequestEvergreenApiUrl: $pageRequestEvergreenApiUrl
                  pageRequestEvergreenApiKey: $pageRequestEvergreenApiKey
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
            pageRequestEvergreenApiUrl: _.get(this.config, 'pageRequestEvergreenApiUrl', ''),
            pageRequestEvergreenApiKey: _.get(this.config, 'pageRequestEvergreenApiKey', '')
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-site-update')
          }
        })
        this.$store.commit('showNotification', {
          style: 'success',
          message: 'Configuration saved successfully',
          icon: 'check'
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    },
  },
  apollo: {
    config: {
      query: gql`
        {
          site {
            config {
              pageRequestEvergreenApiUrl
              pageRequestEvergreenApiKey
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => _.cloneDeep(data.site.config),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-site-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
