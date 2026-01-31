<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-private.svg', alt='Security', style='width: 80px;')
          .admin-header-title
            .headline.primary--text.animated.fadeInLeft {{ $t('admin:security.title') }}
            .subtitle-1.grey--text.animated.fadeInLeft {{ $t('admin:security.subtitle') }}
          v-spacer
          v-btn.animated.fadeInDown(color='success', depressed, @click='save', large)
            v-icon(left) mdi-check
            span {{$t('common:actions.apply')}}
        v-form.pt-3
          v-layout(row wrap)
            v-flex(lg6 xs12)
              v-card.animated.fadeInUp
                v-toolbar(color='red darken-2', dark, dense, flat)
                  v-toolbar-title.subtitle-1 Security
                v-card-info(color='red')
                  span Make sure to understand the implications before turning on / off a security feature.
                v-card-text
                  v-switch(
                    inset
                    label='Block Open Redirect'
                    color='red darken-2'
                    v-model='config.securityOpenRedirect'
                    persistent-hint
                    hint='Prevents user controlled URLs from directing to websites outside of your wiki. This provides Open Redirect protection.'
                    )

                  v-divider.mt-3
                  v-switch.mt-3(
                    inset
                    label='Block IFrame Embedding'
                    color='red darken-2'
                    v-model='config.securityIframe'
                    persistent-hint
                    hint='Prevents other websites from embedding your wiki in an iframe. This provides clickjacking protection.'
                    )

                  v-divider.mt-3
                  v-switch(
                    inset
                    label='Same Origin Referrer Policy'
                    color='red darken-2'
                    v-model='config.securityReferrerPolicy'
                    persistent-hint
                    hint='Limits the referrer header to same origin.'
                    )

                  v-divider.mt-3
                  v-switch(
                    inset
                    label='Trust X-Forwarded-* Proxy Headers'
                    color='red darken-2'
                    v-model='config.securityTrustProxy'
                    persistent-hint
                    hint='Should be enabled when using a reverse-proxy like nginx, apache, CloudFlare, etc in front of Wiki.js. Turn off otherwise.'
                    )

                  //- v-divider.mt-3
                  //- v-switch(
                  //-   inset
                  //-   label='Subresource Integrity (SRI)'
                  //-   color='red darken-2'
                  //-   v-model='config.securitySRI'
                  //-   persistent-hint
                  //-   hint='This ensure that resources such as CSS and JS files are not altered during delivery.'
                  //-   disabled
                  //-   )

                  v-divider.mt-3
                  v-switch(
                    inset
                    label='Enforce HSTS'
                    color='red darken-2'
                    v-model='config.securityHSTS'
                    persistent-hint
                    hint='This ensures the connection cannot be established through an insecure HTTP connection.'
                    )
                  v-select.mt-5(
                    outlined
                    label='HSTS Max Age'
                    :items='hstsDurations'
                    v-model='config.securityHSTSDuration'
                    prepend-icon='mdi-subdirectory-arrow-right'
                    :disabled='!config.securityHSTS'
                    hide-details
                    style='max-width: 450px;'
                    )
                  .pl-11.mt-3
                    .caption Defines the duration for which the server should only deliver content through HTTPS.
                    .caption It's a good idea to start with small values and make sure that nothing breaks on your wiki before moving to longer values.

                  //- v-divider.mt-3
                  //- v-switch(
                  //-   inset
                  //-   label='Enforce CSP'
                  //-   color='red darken-2'
                  //-   v-model='config.securityCSP'
                  //-   persistent-hint
                  //-   hint='Restricts scripts to pre-approved content sources.'
                  //-   disabled
                  //-   )
                  //- v-textarea.mt-5(
                  //-   label='CSP Directives'
                  //-   outlined
                  //-   v-model='config.securityCSPDirectives'
                  //-   prepend-icon='mdi-subdirectory-arrow-right'
                  //-   persistent-hint
                  //-   hint='One directive per line.'
                  //-   disabled
                  //- )

            v-flex(lg6 xs12)
              v-card.animated.fadeInUp.wait-p2s
                v-toolbar(color='primary', dark, dense, flat)
                  v-toolbar-title.subtitle-1 {{ $t('admin:security.uploads') }}
                v-card-info(color='blue')
                  span {{$t('admin:security.uploadsInfo')}}
                v-card-text
                  v-text-field.mt-3(
                    outlined
                    :label='$t(`admin:security.maxUploadSize`)'
                    required
                    v-model='config.uploadMaxFileSize'
                    prepend-icon='mdi-progress-upload'
                    :hint='$t(`admin:security.maxUploadSizeHint`)'
                    persistent-hint
                    :suffix='$t(`admin:security.maxUploadSizeSuffix`)'
                    style='max-width: 450px;'
                    )
                  v-text-field.mt-3(
                    outlined
                    :label='$t(`admin:security.maxUploadBatch`)'
                    required
                    v-model='config.uploadMaxFiles'
                    prepend-icon='mdi-upload-lock'
                    :hint='$t(`admin:security.maxUploadBatchHint`)'
                    persistent-hint
                    :suffix='$t(`admin:security.maxUploadBatchSuffix`)'
                    style='max-width: 450px;'
                    )
                  v-divider.mt-3
                  v-switch(
                    inset
                    label='Scan and Sanitize SVG Uploads'
                    color='primary'
                    v-model='config.uploadScanSVG'
                    persistent-hint
                    hint='Should SVG uploads be scanned for vulnerabilities and stripped of any potentially unsafe content.'
                    )
                  v-divider.mt-3
                  v-switch(
                    inset
                    label='Force Download of Unsafe Extensions'
                    color='primary'
                    v-model='config.uploadForceDownload'
                    persistent-hint
                    hint='Should non-image files be forced as downloads when accessed directly. This prevents potential XSS attacks via unsafe file extensions uploads.'
                    )

              v-card.mt-3.animated.fadeInUp.wait-p2s
                v-toolbar(flat, color='primary', dark, dense)
                  .subtitle-1 {{$t('admin:security.login')}}
                //- v-card-info(color='blue')
                //-   span {{$t('admin:security.loginInfo')}}
                .overline.grey--text.pa-4 {{$t('admin:security.loginScreen')}}
                .px-4.pb-3
                  v-text-field(
                    outlined
                    :label='$t(`admin:security.loginBgUrl`)'
                    v-model='config.authLoginBgUrl'
                    :hint='$t(`admin:security.loginBgUrlHint`)'
                    persistent-hint
                    prepend-icon='mdi-image-area'
                    append-icon='mdi-folder-image'
                    @click:append='browseLoginBg'
                  )
                  v-switch(
                    inset
                    :label='$t(`admin:security.bypassLogin`)'
                    color='primary'
                    v-model='config.authAutoLogin'
                    prepend-icon='mdi-fast-forward'
                    persistent-hint
                    :hint='$t(`admin:security.bypassLoginHint`)'
                    )
                  v-switch(
                    inset
                    :label='$t(`admin:security.hideLocalLogin`)'
                    color='primary'
                    v-model='config.authHideLocal'
                    prepend-icon='mdi-eye-off-outline'
                    persistent-hint
                    :hint='$t(`admin:security.hideLocalLoginHint`)'
                    )
                v-divider.mt-3
                .overline.grey--text.pa-4 {{$t('admin:security.loginSecurity')}}
                .px-4.pb-3
                  v-switch.mt-0(
                    inset
                    :label='$t(`admin:security.enforce2fa`)'
                    color='primary'
                    v-model='config.authEnforce2FA'
                    prepend-icon='mdi-two-factor-authentication'
                    :hint='$t(`admin:security.enforce2faHint`)'
                    persistent-hint
                  )
                v-divider.mt-3
                .overline.grey--text.pa-4 {{$t('admin:security.jwt')}}
                .px-4.pb-3
                  v-text-field(
                    v-model='config.authJwtAudience'
                    outlined
                    prepend-icon='mdi-account-group-outline'
                    :label='$t(`admin:auth.jwtAudience`)'
                    :hint='$t(`admin:auth.jwtAudienceHint`)'
                    persistent-hint
                  )
                  v-text-field.mt-3(
                    v-model='config.authJwtExpiration'
                    outlined
                    prepend-icon='mdi-clock-outline'
                    :label='$t(`admin:auth.tokenExpiration`)'
                    :hint='$t(`admin:auth.tokenExpirationHint`)'
                    persistent-hint
                  )
                  v-text-field.mt-3(
                    v-model='config.authJwtRenewablePeriod'
                    outlined
                    prepend-icon='mdi-update'
                    :label='$t(`admin:auth.tokenRenewalPeriod`)'
                    :hint='$t(`admin:auth.tokenRenewalPeriodHint`)'
                    persistent-hint
                  )

              v-card.mt-3.animated.fadeInUp.wait-p2s
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

              v-card.mt-3.animated.fadeInUp.wait-p2s
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

    component(:is='activeModal')
</template>

<script>
import _ from 'lodash'
import { sync } from 'vuex-pathify'
import gql from 'graphql-tag'

import editorStore from '../../store/editor'

/* global WIKI */

WIKI.$store.registerModule('editor', editorStore)

export default {
  i18nOptions: { namespaces: 'editor' },
  components: {
    editorModalMedia: () => import(/* webpackChunkName: "editor", webpackMode: "lazy" */ '../editor/editor-modal-media.vue')
  },
  data() {
    return {
      config: {
        uploadMaxFileSize: 0,
        uploadMaxFiles: 0,
        uploadScanSVG: true,
        uploadForceDownload: true,
        securityOpenRedirect: true,
        securityIframe: true,
        securityReferrerPolicy: true,
        securityTrustProxy: false,
        securitySRI: true,
        securityHSTS: false,
        securityHSTSDuration: 0,
        securityCSP: false,
        securityCSPDirectives: '',
        authAutoLogin: false,
        authHideLocal: false,
        authLoginBgUrl: '',
        authJwtAudience: 'urn:wiki.js',
        authJwtExpiration: '30m',
        authJwtRenewablePeriod: '14d',
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
      },
      hstsDurations: [
        { value: 300, text: '5 minutes' },
        { value: 86400, text: '1 day' },
        { value: 604800, text: '1 week' },
        { value: 2592000, text: '1 month' },
        { value: 31536000, text: '1 year' },
        { value: 63072000, text: '2 years' }
      ]
    }
  },
  computed: {
    activeModal: sync('editor/activeModal')
  },
  methods: {
    async save () {
      try {
        await this.$apollo.mutate({
          mutation: gql`
            mutation (
              $authAutoLogin: Boolean
              $authEnforce2FA: Boolean
              $authHideLocal: Boolean
              $authLoginBgUrl: String
              $authJwtAudience: String
              $authJwtExpiration: String
              $authJwtRenewablePeriod: String
              $uploadMaxFileSize: Int
              $uploadMaxFiles: Int
              $uploadScanSVG: Boolean
              $uploadForceDownload: Boolean
              $securityOpenRedirect: Boolean
              $securityIframe: Boolean
              $securityReferrerPolicy: Boolean
              $securityTrustProxy: Boolean
              $securitySRI: Boolean
              $securityHSTS: Boolean
              $securityHSTSDuration: Int
              $securityCSP: Boolean
              $securityCSPDirectives: String
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
                  authAutoLogin: $authAutoLogin,
                  authEnforce2FA: $authEnforce2FA,
                  authHideLocal: $authHideLocal,
                  authLoginBgUrl: $authLoginBgUrl,
                  authJwtAudience: $authJwtAudience,
                  authJwtExpiration: $authJwtExpiration,
                  authJwtRenewablePeriod: $authJwtRenewablePeriod,
                  uploadMaxFileSize: $uploadMaxFileSize,
                  uploadMaxFiles: $uploadMaxFiles,
                  uploadScanSVG: $uploadScanSVG
                  uploadForceDownload: $uploadForceDownload,
                  securityOpenRedirect: $securityOpenRedirect,
                  securityIframe: $securityIframe,
                  securityReferrerPolicy: $securityReferrerPolicy,
                  securityTrustProxy: $securityTrustProxy,
                  securitySRI: $securitySRI,
                  securityHSTS: $securityHSTS,
                  securityHSTSDuration: $securityHSTSDuration,
                  securityCSP: $securityCSP,
                  securityCSPDirectives: $securityCSPDirectives
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
            authAutoLogin: _.get(this.config, 'authAutoLogin', false),
            authEnforce2FA: _.get(this.config, 'authEnforce2FA', false),
            authHideLocal: _.get(this.config, 'authHideLocal', false),
            authLoginBgUrl: _.get(this.config, 'authLoginBgUrl', ''),
            authJwtAudience: _.get(this.config, 'authJwtAudience', ''),
            authJwtExpiration: _.get(this.config, 'authJwtExpiration', ''),
            authJwtRenewablePeriod: _.get(this.config, 'authJwtRenewablePeriod', ''),
            uploadMaxFileSize: _.toSafeInteger(_.get(this.config, 'uploadMaxFileSize', 0)),
            uploadMaxFiles: _.toSafeInteger(_.get(this.config, 'uploadMaxFiles', 0)),
            uploadScanSVG: _.get(this.config, 'uploadScanSVG', false),
            uploadForceDownload: _.get(this.config, 'uploadForceDownload', false),
            securityOpenRedirect: _.get(this.config, 'securityOpenRedirect', false),
            securityIframe: _.get(this.config, 'securityIframe', false),
            securityReferrerPolicy: _.get(this.config, 'securityReferrerPolicy', false),
            securityTrustProxy: _.get(this.config, 'securityTrustProxy', false),
            securitySRI: _.get(this.config, 'securitySRI', false),
            securityHSTS: _.get(this.config, 'securityHSTS', false),
            securityHSTSDuration: _.get(this.config, 'securityHSTSDuration', 0),
            securityCSP: _.get(this.config, 'securityCSP', false),
            securityCSPDirectives: _.get(this.config, 'securityCSPDirectives', ''),
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
            this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-site-update')
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
    },
    browseLoginBg () {
      this.$store.set('editor/editorKey', 'common')
      this.activeModal = 'editorModalMedia'
    }
  },
  mounted () {
    this.$root.$on('editorInsert', opts => {
      this.config.authLoginBgUrl = opts.path
    })
  },
  beforeDestroy() {
    this.$root.$off('editorInsert')
  },
  apollo: {
    config: {
      query: gql`
        {
          site {
            config {
              authAutoLogin
              authEnforce2FA
              authHideLocal
              authLoginBgUrl
              authJwtAudience
              authJwtExpiration
              authJwtRenewablePeriod
              uploadMaxFileSize
              uploadMaxFiles
              uploadScanSVG
              uploadForceDownload
              securityOpenRedirect
              securityIframe
              securityReferrerPolicy
              securityTrustProxy
              securitySRI
              securityHSTS
              securityHSTSDuration
              securityCSP
              securityCSPDirectives
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
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'admin-security-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
