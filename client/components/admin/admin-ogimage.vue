<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row, wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-new-post.svg', alt='OG Images', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft OG Images
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p4s Configure the OG image proxy and upstream service.
          v-spacer
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span {{$t('common:actions.apply')}}

        v-card.mt-3.animated.fadeInUp
          v-toolbar(color='primary', dark, dense, flat)
            v-toolbar-title.subtitle-1 Configuration
          .pa-4
            v-switch(
              v-model='config.enabled'
              label='Enable OG images'
              color='primary'
              inset
              )
            v-text-field.mt-2(
              outlined
              v-model='config.serviceBaseUrl'
              label='OG service base URL (e.g. https://og.example.com/_og)'
              prepend-icon='mdi-link-variant'
              :disabled='!config.enabled'
              )
            v-text-field(
              outlined
              v-model='config.defaultTemplate'
              label='Default template'
              prepend-icon='mdi-image-outline'
              :disabled='!config.enabled'
              )
            v-select(
              outlined
              v-model='config.authMode'
              :items='authModes'
              label='Proxy auth mode (to OG service)'
              prepend-icon='mdi-shield-key-outline'
              :disabled='!config.enabled'
              )
            v-text-field(
              outlined
              v-model='config.headerName'
              label='Secret header name'
              prepend-icon='mdi-form-textbox'
              :disabled='!config.enabled || config.authMode !== \"header\"'
              )
            v-text-field(
              outlined
              v-model='config.sharedSecret'
              label='Shared secret (sent by proxy)'
              prepend-icon='mdi-form-textbox-password'
              type='password'
              :disabled='!config.enabled || config.authMode !== \"header\"'
              )
            v-text-field(
              outlined
              v-model='config.timeoutMs'
              label='Upstream timeout (ms)'
              prepend-icon='mdi-timer-outline'
              :disabled='!config.enabled'
              style='max-width: 280px;'
              )

          v-divider
          .pa-4
            .overline.grey--text Preview
            .body-2.grey--text.text--darken-2 The HTML will emit an absolute URL pointing at this wiki: `/_og/<pageId>.png?...`.

</template>

<script>
import _ from 'lodash'

import ogImageConfigQuery from 'gql/admin/ogimage/ogimage-query-config.gql'
import ogImageUpdateConfigMutation from 'gql/admin/ogimage/ogimage-mutation-update-config.gql'

export default {
  data() {
    return {
      config: {
        enabled: false,
        serviceBaseUrl: '',
        defaultTemplate: 'default',
        authMode: 'header',
        sharedSecret: '',
        headerName: 'x-og-secret',
        timeoutMs: 5000
      },
      authModes: [
        { text: 'None', value: 'none' },
        { text: 'Header secret', value: 'header' }
      ]
    }
  },
  apollo: {
    config: {
      query: ogImageConfigQuery,
      fetchPolicy: 'network-only',
      update: data => data.ogImage.config,
      watchLoading(isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-ogimage-load')
      }
    }
  },
  methods: {
    async save () {
      try {
        await this.$apollo.mutate({
          mutation: ogImageUpdateConfigMutation,
          variables: {
            enabled: this.config.enabled,
            serviceBaseUrl: this.config.serviceBaseUrl || '',
            defaultTemplate: this.config.defaultTemplate || 'default',
            authMode: this.config.authMode || 'header',
            sharedSecret: this.config.sharedSecret || '',
            headerName: this.config.headerName || 'x-og-secret',
            timeoutMs: _.toSafeInteger(this.config.timeoutMs) || 5000
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-ogimage-save')
          }
        })
        this.$store.commit('showNotification', {
          style: 'success',
          message: 'OG image configuration saved successfully.',
          icon: 'check'
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    }
  }
}
</script>
