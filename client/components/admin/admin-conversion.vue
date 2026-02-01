<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-line-chart.svg', alt='Conversion', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft {{ $t('conversion:title') }}
            .subtitle-1.grey--text.animated.fadeInLeft {{ $t('conversion:subtitle') }}
          v-spacer
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span {{$t('common:actions.apply')}}
        v-form.pt-3
          v-layout(row wrap)
            v-flex(lg6 xs12)
              v-card.animated.fadeInUp.wait-p2s
                v-toolbar(flat, color='teal', dark, dense)
                  .subtitle-1 Anonymous View Limits
                v-card-info(color='teal')
                  span Limit anonymous page views before prompting users to sign in.
                v-card-text
                  v-switch(
                    inset
                    label='Enable Anonymous View Limit'
                    color='teal'
                    v-model='config.anonViewLimitEnabled'
                    persistent-hint
                    hint='When enabled, anonymous users can only view a limited number of pages before content is truncated.'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='Page View Limit'
                    v-model='config.anonViewLimitCount'
                    type='number'
                    min='1'
                    prepend-icon='mdi-book-open-page-variant'
                    persistent-hint
                    hint='Number of pages an anonymous user can view per reset window.'
                    style='max-width: 300px;'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='Reset Window (Hours)'
                    v-model='config.anonViewLimitResetHours'
                    type='number'
                    min='1'
                    prepend-icon='mdi-timer-outline'
                    persistent-hint
                    hint='How long before the anonymous view count resets.'
                    style='max-width: 300px;'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='Truncate Percent'
                    v-model='config.anonViewLimitTruncatePercent'
                    type='number'
                    min='5'
                    max='100'
                    prepend-icon='mdi-content-cut'
                    persistent-hint
                    hint='Percent of content to show when limit is reached.'
                    style='max-width: 300px;'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='Warn Threshold (Remaining Views)'
                    v-model='config.anonViewLimitWarnThreshold'
                    type='number'
                    min='0'
                    prepend-icon='mdi-alert-circle-outline'
                    persistent-hint
                    hint='Show a warning banner when remaining views are at or below this value.'
                    style='max-width: 300px;'
                    )
                  v-switch.mt-3(
                    inset
                    label='Exempt Search Engine Bots'
                    color='teal'
                    v-model='config.anonViewLimitExemptBots'
                    persistent-hint
                    hint='When enabled, detected bots will not be limited (use with caution).'
                    )
                  v-switch.mt-3(
                    inset
                    label='Add noindex When Limited'
                    color='teal'
                    v-model='config.anonViewLimitNoIndexOnLimit'
                    persistent-hint
                    hint='Adds noindex/noarchive when content is truncated for anonymous users.'
                    )
                  v-combobox.mt-3(
                    v-model='config.anonViewLimitExemptPaths'
                    label='Exempt Paths'
                    outlined
                    chips
                    multiple
                    small-chips
                    prepend-icon='mdi-link-variant'
                    persistent-hint
                    hint='Paths or prefixes to exclude (e.g., home, login, register, docs/*).'
                    )
                  v-combobox.mt-3(
                    v-model='config.anonViewLimitExemptTags'
                    label='Exempt Tags'
                    outlined
                    chips
                    multiple
                    small-chips
                    prepend-icon='mdi-tag-multiple'
                    persistent-hint
                    hint='Tag slugs to exclude from anonymous view limits.'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='IP Hash Secret'
                    v-model='config.anonViewLimitHashSecret'
                    type='password'
                    prepend-icon='mdi-shield-key-outline'
                    persistent-hint
                    hint='Secret used to hash IPs for anonymous tracking (leave empty to use session secret).'
                    )

            v-flex(lg6 xs12)
              v-card.animated.fadeInUp.wait-p2s
                v-toolbar(flat, color='blue-grey', dark, dense)
                  .subtitle-1 Conversion CTAs
                v-card-info(color='blue-grey')
                  span Configure banners/modals that encourage anonymous users to sign in.
                v-card-text
                  v-switch(
                    inset
                    label='Enable Conversion CTAs'
                    color='blue-grey'
                    v-model='config.conversionCtaEnabled'
                    persistent-hint
                    hint='Show soft prompts and overlays to convert anonymous visitors.'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='CTA Frequency (Hours)'
                    v-model='config.conversionCtaFrequencyHours'
                    type='number'
                    min='1'
                    prepend-icon='mdi-bell-outline'
                    persistent-hint
                    hint='Minimum hours between CTA displays for the same visitor.'
                    style='max-width: 300px;'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='Soft Prompt Threshold (Remaining Views)'
                    v-model='config.conversionCtaSoftPromptPages'
                    type='number'
                    min='0'
                    prepend-icon='mdi-message-alert-outline'
                    persistent-hint
                    hint='Show a soft prompt when remaining views are at or below this value.'
                    style='max-width: 300px;'
                    )
                  v-combobox.mt-3(
                    v-model='config.conversionCtaVariants'
                    label='CTA Variants'
                    outlined
                    chips
                    multiple
                    small-chips
                    prepend-icon='mdi-shape-outline'
                    persistent-hint
                    hint='List of variant keys for A/B testing.'
                    )

            v-flex(xs12)
              v-card.mt-3.animated.fadeInUp.wait-p2s
                v-toolbar(flat, color='indigo', dark, dense)
                  .subtitle-1 External User Portal (Future)
                v-card-info(color='indigo')
                  span Reserved for future integration with tickets and conversations.
                v-card-text
                  v-switch(
                    inset
                    label='Enable External User Portal'
                    color='indigo'
                    v-model='config.externalUserPortalEnabled'
                    persistent-hint
                    hint='Reserved for future integration (no effect yet).'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='Base URL'
                    v-model='config.externalUserPortalBaseUrl'
                    prepend-icon='mdi-link-variant'
                    persistent-hint
                    hint='Base URL of the external portal service.'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='API Key'
                    v-model='config.externalUserPortalApiKey'
                    type='password'
                    prepend-icon='mdi-key-outline'
                    persistent-hint
                    hint='API key for the external portal service.'
                    )
                  v-text-field.mt-3(
                    outlined
                    label='Timeout (ms)'
                    v-model='config.externalUserPortalTimeoutMs'
                    type='number'
                    min='1000'
                    prepend-icon='mdi-timer'
                    persistent-hint
                    hint='Request timeout for portal API calls.'
                    style='max-width: 300px;'
                    )
</template>

<script>
import _ from 'lodash'
import gql from 'graphql-tag'

export default {
  i18nOptions: { namespaces: ['admin', 'conversion'] },
  data() {
    return {
      config: {
        anonViewLimitEnabled: false,
        anonViewLimitCount: 3,
        anonViewLimitResetHours: 24,
        anonViewLimitExemptPaths: [],
        anonViewLimitExemptTags: [],
        anonViewLimitExemptBots: false,
        anonViewLimitTruncatePercent: 30,
        anonViewLimitHashSecret: '',
        anonViewLimitWarnThreshold: 1,
        anonViewLimitNoIndexOnLimit: true,
        conversionCtaEnabled: true,
        conversionCtaVariants: ['default'],
        conversionCtaFrequencyHours: 24,
        conversionCtaSoftPromptPages: 1,
        externalUserPortalEnabled: false,
        externalUserPortalBaseUrl: '',
        externalUserPortalApiKey: '',
        externalUserPortalTimeoutMs: 5000
      }
    }
  },
  methods: {
    async save () {
      try {
        await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $anonViewLimitEnabled: Boolean
              $anonViewLimitCount: Int
              $anonViewLimitResetHours: Int
              $anonViewLimitExemptPaths: [String]
              $anonViewLimitExemptTags: [String]
              $anonViewLimitExemptBots: Boolean
              $anonViewLimitTruncatePercent: Int
              $anonViewLimitHashSecret: String
              $anonViewLimitWarnThreshold: Int
              $anonViewLimitNoIndexOnLimit: Boolean
              $conversionCtaEnabled: Boolean
              $conversionCtaVariants: [String]
              $conversionCtaFrequencyHours: Int
              $conversionCtaSoftPromptPages: Int
              $externalUserPortalEnabled: Boolean
              $externalUserPortalBaseUrl: String
              $externalUserPortalApiKey: String
              $externalUserPortalTimeoutMs: Int
            ) {
              site {
                updateConfig(
                  anonViewLimitEnabled: $anonViewLimitEnabled,
                  anonViewLimitCount: $anonViewLimitCount,
                  anonViewLimitResetHours: $anonViewLimitResetHours,
                  anonViewLimitExemptPaths: $anonViewLimitExemptPaths,
                  anonViewLimitExemptTags: $anonViewLimitExemptTags,
                  anonViewLimitExemptBots: $anonViewLimitExemptBots,
                  anonViewLimitTruncatePercent: $anonViewLimitTruncatePercent,
                  anonViewLimitHashSecret: $anonViewLimitHashSecret,
                  anonViewLimitWarnThreshold: $anonViewLimitWarnThreshold,
                  anonViewLimitNoIndexOnLimit: $anonViewLimitNoIndexOnLimit,
                  conversionCtaEnabled: $conversionCtaEnabled,
                  conversionCtaVariants: $conversionCtaVariants,
                  conversionCtaFrequencyHours: $conversionCtaFrequencyHours,
                  conversionCtaSoftPromptPages: $conversionCtaSoftPromptPages,
                  externalUserPortalEnabled: $externalUserPortalEnabled,
                  externalUserPortalBaseUrl: $externalUserPortalBaseUrl,
                  externalUserPortalApiKey: $externalUserPortalApiKey,
                  externalUserPortalTimeoutMs: $externalUserPortalTimeoutMs
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
            anonViewLimitEnabled: _.get(this.config, 'anonViewLimitEnabled', false),
            anonViewLimitCount: _.toSafeInteger(_.get(this.config, 'anonViewLimitCount', 3)),
            anonViewLimitResetHours: _.toSafeInteger(_.get(this.config, 'anonViewLimitResetHours', 24)),
            anonViewLimitExemptPaths: _.get(this.config, 'anonViewLimitExemptPaths', []),
            anonViewLimitExemptTags: _.get(this.config, 'anonViewLimitExemptTags', []),
            anonViewLimitExemptBots: _.get(this.config, 'anonViewLimitExemptBots', false),
            anonViewLimitTruncatePercent: _.toSafeInteger(_.get(this.config, 'anonViewLimitTruncatePercent', 30)),
            anonViewLimitHashSecret: _.get(this.config, 'anonViewLimitHashSecret', ''),
            anonViewLimitWarnThreshold: _.toSafeInteger(_.get(this.config, 'anonViewLimitWarnThreshold', 1)),
            anonViewLimitNoIndexOnLimit: _.get(this.config, 'anonViewLimitNoIndexOnLimit', true),
            conversionCtaEnabled: _.get(this.config, 'conversionCtaEnabled', true),
            conversionCtaVariants: _.get(this.config, 'conversionCtaVariants', ['default']),
            conversionCtaFrequencyHours: _.toSafeInteger(_.get(this.config, 'conversionCtaFrequencyHours', 24)),
            conversionCtaSoftPromptPages: _.toSafeInteger(_.get(this.config, 'conversionCtaSoftPromptPages', 1)),
            externalUserPortalEnabled: _.get(this.config, 'externalUserPortalEnabled', false),
            externalUserPortalBaseUrl: _.get(this.config, 'externalUserPortalBaseUrl', ''),
            externalUserPortalApiKey: _.get(this.config, 'externalUserPortalApiKey', ''),
            externalUserPortalTimeoutMs: _.toSafeInteger(_.get(this.config, 'externalUserPortalTimeoutMs', 5000))
          },
          watchLoading (isLoading) {
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-conversion-save')
          }
        })
        this.$store.commit('showNotification', {
          style: 'success',
          message: 'Configuration saved successfully.',
          icon: 'check'
        })
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    }
  },
  apollo: {
    config: {
      query: gql`
        {
          site {
            config {
              anonViewLimitEnabled
              anonViewLimitCount
              anonViewLimitResetHours
              anonViewLimitExemptPaths
              anonViewLimitExemptTags
              anonViewLimitExemptBots
              anonViewLimitTruncatePercent
              anonViewLimitHashSecret
              anonViewLimitWarnThreshold
              anonViewLimitNoIndexOnLimit
              conversionCtaEnabled
              conversionCtaVariants
              conversionCtaFrequencyHours
              conversionCtaSoftPromptPages
              externalUserPortalEnabled
              externalUserPortalBaseUrl
              externalUserPortalApiKey
              externalUserPortalTimeoutMs
            }
          }
        }
      `,
      fetchPolicy: 'network-only',
      update: (data) => _.cloneDeep(data.site.config),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-conversion-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
