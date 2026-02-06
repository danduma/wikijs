<template lang="pug">
  v-app(v-scroll='upBtnScroll', :dark='$vuetify.theme.dark', :class='[$vuetify.rtl ? `is-rtl` : `is-ltr`, { "custom-home-page": path === `home` }]')
    nav-header(v-if='!printView', :hide-search='true')
      template(v-slot:mid)
        v-menu(
          v-if='searchEnabled && $vuetify.breakpoint.mdAndUp'
          v-model='searchMenuShown'
          offset-y
          :close-on-content-click='false'
          :close-on-click='false'
          :open-on-click='false'
          open-on-focus
          :nudge-bottom="8"
          :min-width='searchMenuWidth || 400'
          :max-width='searchMenuWidth || 400'
          content-class='search-results-menu'
          transition='slide-y-transition'
          @click:outside='searchMenuShown = false'
        )
          template(v-slot:activator='{ on, attrs }')
            v-text-field.longevidence-header-search(
              v-bind='attrs'
              v-on='on'
              ref='headerSearchInput'
              v-model='searchQuery'
              placeholder='Search Longevipedia...'
              solo
              flat
              dense
              rounded
              hide-details
              prepend-inner-icon='mdi-magnify'
              background-color='white'
              light
              @focus='searchMenuShown = true'
            )
          search-overlay(
            :query='searchQuery'
            @close='searchMenuShown = false'
          )

      template(v-slot:actions)
        //- Mobile search trigger
        v-menu(
          v-if='searchEnabled && $vuetify.breakpoint.smAndDown'
          v-model='searchMenuMobileShown'
          fullscreen
          transition='dialog-bottom-transition'
          :close-on-content-click='false'
        )
          template(v-slot:activator='{ on, attrs }')
            v-btn(icon, v-bind='attrs', v-on='on')
              v-icon mdi-magnify
          v-card(tile)
            v-toolbar(flat, color='white')
              v-btn(icon, @click='searchMenuMobileShown = false')
                v-icon mdi-arrow-left
              v-text-field(
                v-model='searchQuery'
                placeholder='Search...'
                solo
                flat
                hide-details
                autofocus
                clearable
              )
            v-divider
            search-overlay(
              :query='searchQuery'
              @close='searchMenuMobileShown = false'
            )

        v-tooltip(bottom, v-if='commentsEnabled && commentsPerms.read')
          template(v-slot:activator='{ on }')
            v-btn(icon, v-on='on', @click='commentsShown = !commentsShown', :aria-label='`Comments`')
              v-badge(
                :content='commentsCount'
                :value='commentsCount > 0'
                overlap
                color='pink darken-1'
                )
                v-icon(color='grey') mdi-comment-text-outline
          span Comments
    v-navigation-drawer(
      v-if='navMode !== `NONE` && !printView'
      :class='$vuetify.theme.dark ? `grey darken-4-d4` : `primary`'
      dark
      app
      clipped
      mobile-breakpoint='600'
      :temporary='$vuetify.breakpoint.smAndDown'
      v-model='navShown'
      :right='$vuetify.rtl'
      )
      vue-scroll(:ops='scrollStyle')
        nav-sidebar(:color='$vuetify.theme.dark ? `grey darken-4-d4` : `primary`', :items='sidebarDecoded', :nav-mode='navMode')

    v-fab-transition(v-if='navMode !== `NONE`')
      v-btn(
        fab
        color='primary'
        fixed
        bottom
        :right='$vuetify.rtl'
        :left='!$vuetify.rtl'
        small
        @click='navShown = !navShown'
        v-if='$vuetify.breakpoint.mdAndDown'
        v-show='!navShown'
        )
        v-icon mdi-menu

    v-main(ref='content')
      template(v-if='path !== `home`')
        v-toolbar(:color='$vuetify.theme.dark ? `grey darken-4-d3` : `grey lighten-3`', flat, dense, v-if='$vuetify.breakpoint.smAndUp')
          //- v-btn.pl-0(v-if='$vuetify.breakpoint.xsOnly', flat, @click='toggleNavigation')
          //-   v-icon(color='grey darken-2', left) menu
          //-   span Navigation
          v-breadcrumbs.breadcrumbs-nav.pl-0(
            :items='breadcrumbs'
            divider='/'
            )
            template(slot='item', slot-scope='props')
              v-icon(v-if='props.item.path === \"/\"', small, @click='goHome') mdi-home
              v-btn.ma-0(v-else, :href='props.item.path', small, text) {{props.item.name}}
          template(v-if='!isPublished')
            v-spacer
            .caption.red--text {{$t('common:page.unpublished')}}
            status-indicator.ml-3(negative, pulse)
        v-divider
      v-container.grey.pa-0(fluid, :class='$vuetify.theme.dark ? `darken-4-l3` : `lighten-4`')
        v-row.category-hero-section.py-10(v-if='heroImage', no-gutters, align='center', justify='center')
          v-container
            v-row.category-hero-row(align='stretch', justify='space-between')
              v-col.category-hero-title-col(cols='7', sm='7', md='7')
                h1.category-hero-title {{ heroTitle }}
                .category-hero-subtitle.opacity-70.category-hero-subtitle--desktop(v-if='heroSubtitle') {{ heroSubtitle }}
              v-col.category-hero-image-col(cols='5', sm='5', md='5')
                v-img.category-hero-image(:src='heroImage', max-height='250', contain)
            .category-hero-subtitle.opacity-70.category-hero-subtitle--mobile(v-if='heroSubtitle') {{ heroSubtitle }}
        v-row.page-header-section(v-else, no-gutters, align-content='center', style='height: 90px;')
          v-col.page-col-content.is-page-header(
            :offset-xl='tocEnabled && tocPosition === `left` ? 2 : 0'
            :offset-lg='tocEnabled && tocPosition === `left` ? 3 : 0'
            :xl='tocEnabled && tocPosition === `right` ? 10 : false'
            :lg='tocEnabled && tocPosition === `right` ? 9 : false'
            style='margin-top: auto; margin-bottom: auto;'
            :class='$vuetify.rtl ? `pr-4` : `pl-4`'
            )
            .page-header-headings
              .headline.grey--text(:class='$vuetify.theme.dark ? `text--lighten-2` : `text--darken-3`') {{title}}
              .caption.grey--text.text--darken-1 {{description}}
            .page-edit-shortcuts(
              v-if='editShortcutsObj.editMenuBar'
              :class='tocEnabled && tocPosition === `right` ? `is-right` : ``'
              )
              v-btn(
                v-if='editShortcutsObj.editMenuBtn'
                @click='pageEdit'
                depressed
                small
                )
                v-icon.mr-2(small) mdi-pencil
                span.text-none {{$t(`common:actions.edit`)}}
              v-btn(
                v-if='editShortcutsObj.editMenuExternalBtn'
                :href='editMenuExternalUrl'
                target='_blank'
                depressed
                small
                )
                v-icon.mr-2(small) {{ editShortcutsObj.editMenuExternalIcon }}
                span.text-none {{$t(`common:page.editExternal`, { name: editShortcutsObj.editMenuExternalName })}}
      v-divider
      v-container(fluid, grid-list-xl, class='pa-0')
        v-layout(row)
          v-flex.page-col-sd(
            v-if='tocEnabled && tocPosition !== `off` && $vuetify.breakpoint.lgAndUp'
            :order-xs1='tocPosition !== `right`'
            :order-xs2='tocPosition === `right`'
            lg3
            xl2
            )
            v-card.page-toc-card.mb-5(v-if='tocDecoded.length')
              .overline.pa-5.pb-0(:class='$vuetify.theme.dark ? `blue--text text--lighten-2` : `primary--text`') {{$t('common:page.toc')}}
              v-list.pb-3(dense, nav, :class='$vuetify.theme.dark ? `darken-3-d3` : ``')
                template(v-for='(tocItem, tocIdx) in tocDecoded')
                  v-list-item(@click='$vuetify.goTo(tocItem.anchor, scrollOpts)')
                    v-icon(color='grey', small) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                    v-list-item-title.px-3 {{tocItem.title}}
                  //- v-divider(v-if='tocIdx < toc.length - 1 || tocItem.children.length')
                  template(v-for='tocSubItem in tocItem.children')
                    v-list-item(@click='$vuetify.goTo(tocSubItem.anchor, scrollOpts)')
                      v-icon.px-3(color='grey lighten-1', small) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                      v-list-item-title.px-3.caption.grey--text(:class='$vuetify.theme.dark ? `text--lighten-1` : `text--darken-1`') {{tocSubItem.title}}
                    //- v-divider(inset, v-if='tocIdx < toc.length - 1')

            v-card.page-tags-card.mb-5(v-if='tagsEnabled && tags.length > 0')
              .pa-5
                .overline.teal--text.pb-2(:class='$vuetify.theme.dark ? `text--lighten-3` : ``') {{$t('common:page.tags')}}
                v-chip.mr-1.mb-1(
                  label
                  :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                  v-for='(tag, idx) in tags'
                  :href='`/t/` + tag.tag'
                  :key='`tag-` + tag.tag'
                  )
                  v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', left, small) mdi-tag
                  span(:class='$vuetify.theme.dark ? `teal--text text--lighten-5` : `teal--text text--darken-2`') {{tag.title}}
                v-chip.mr-1.mb-1(
                  label
                  :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                  :href='`/t/` + tags.map(t => t.tag).join(`/`)'
                  :aria-label='$t(`common:page.tagsMatching`)'
                  )
                  v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', size='20') mdi-tag-multiple

            v-card.page-author-card.mb-5(v-if='canReadHistory')
              .pa-5
                v-btn(
                  block
                  outlined
                  color='indigo'
                  :href='"/h/" + locale + "/" + path'
                  )
                  v-icon(left) mdi-history
                  span Edit history

          v-flex.page-col-content.pa-0(
            xs12
            :lg9='tocEnabled && tocPosition !== `off`'
            :xl10='tocEnabled && tocPosition !== `off`'
            :order-xs1='tocPosition === `right`'
            :order-xs2='tocPosition !== `right`'
            )
            v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasAnyPagePermissions && editShortcutsObj.editFab')
              template(v-slot:activator='{ on: onEditActivator }')
                v-speed-dial(
                  v-model='pageEditFab'
                  direction='top'
                  open-on-hover
                  transition='scale-transition'
                  bottom
                  :right='!$vuetify.rtl'
                  :left='$vuetify.rtl'
                  fixed
                  dark
                  )
                  template(v-slot:activator)
                    v-btn.btn-animate-edit(
                      fab
                      color='primary'
                      v-model='pageEditFab'
                      @click='pageEdit'
                      v-on='onEditActivator'
                      :disabled='!hasWritePagesPermission'
                      :aria-label='$t(`common:page.editPage`)'
                      )
                      v-icon mdi-pencil
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='canReadHistory')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageHistory'
                        )
                        v-icon(size='20') mdi-history
                    span {{$t('common:header.history')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasReadSourcePermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageSource'
                        )
                        v-icon(size='20') mdi-code-tags
                    span {{$t('common:header.viewSource')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasWritePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageConvert'
                        )
                        v-icon(size='20') mdi-lightning-bolt
                    span {{$t('common:header.convert')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasWritePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageDuplicate'
                        )
                        v-icon(size='20') mdi-content-duplicate
                    span {{$t('common:header.duplicate')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasManagePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        small
                        color='white'
                        light
                        v-on='on'
                        @click='pageMove'
                        )
                        v-icon(size='20') mdi-content-save-move-outline
                    span {{$t('common:header.move')}}
                  v-tooltip(:right='$vuetify.rtl', :left='!$vuetify.rtl', v-if='hasDeletePagesPermission')
                    template(v-slot:activator='{ on }')
                      v-btn(
                        fab
                        dark
                        small
                        color='red'
                        v-on='on'
                        @click='pageDelete'
                        )
                        v-icon(size='20') mdi-trash-can-outline
                    span {{$t('common:header.delete')}}
              span {{$t('common:page.editPage')}}
            v-alert.mb-5(v-if='!isPublished', color='red', outlined, icon='mdi-minus-circle', dense)
              .caption {{$t('common:page.unpublishedWarning')}}
            v-alert.mb-4(
              v-if='(showSoftPrompt || warnReached) && !limitReached'
              color='blue-grey'
              outlined
              dense
              icon='mdi-account-arrow-right'
              )
              .d-flex.align-center.flex-wrap
                .mr-4(v-if='remainingViewsText') {{ remainingViewsText }}
                span {{$t('common:conversion.body')}}
                v-spacer
                template(v-if='showSoftPrompt')
                  v-btn.ml-2(color='primary', small, @click='ctaSignIn') {{$t('common:conversion.signIn')}}
                  v-btn.ml-2(color='grey', small, text, @click='ctaRegister') {{$t('common:conversion.createAccount')}}
            .contents(ref='container', :class='{ "anon-view-limited": limitReached }')
              slot(name='contents')
              .anon-view-fade(v-if='limitReached')
              .anon-view-cta(v-if='showLimitCta')
                v-card.anon-view-cta-card(:class='ctaVariant ? `anon-view-cta-variant-${ctaVariant}` : ``', elevation='6')
                  .overline.text-uppercase {{$t('common:conversion.limitedNotice')}}
                  .title.mt-2 {{$t('common:conversion.title')}}
                  .body-2.mt-2 {{$t('common:conversion.body')}}
                  .caption.mt-2(v-if='remainingViewsText') {{ remainingViewsText }}
                  .mt-4
                    v-btn(color='primary', @click='ctaSignIn') {{$t('common:conversion.signIn')}}
                    v-btn.ml-2(color='grey', text, @click='ctaRegister') {{$t('common:conversion.createAccount')}}
      side-comments(
        v-if='commentsEnabled && commentsPerms.read && !printView'
        :all-comments='currentComments'
      )
      nav-footer
      notify
      template(v-if='commentsEnabled && commentsPerms.read && !printView')
        .page-comments-scrim(v-show='commentsShown', @click='commentsShown = false', data-ui-id='LongevidenceCommentsSidebarScrim')
        aside.page-comments-sidebar(:class='{ \"is-open\": commentsShown }', :aria-hidden='(!commentsShown).toString()', data-ui-id='LongevidenceCommentsSidebar')
          header.page-comments-sidebar-header(:class='$vuetify.theme.dark ? `grey darken-4-d3` : `grey lighten-4`')
            v-icon.mr-2 mdi-comment-text-outline
            .subtitle-1.font-weight-medium Comments
            v-spacer
            v-btn(icon, @click='commentsShown = false', :aria-label='$t(`common:actions.close`)')
              v-icon mdi-close
          v-divider
          .page-comments-sidebar-content
            slot(name='comments')

      v-dialog(v-model='medicalDisclaimerShown', max-width='800')
        v-card
          v-card-title.headline.white--text(style='background-color: #5e3c7d')
            | {{ $t('common:medical.title') }}
            v-spacer
            v-btn(icon, dark, @click='medicalDisclaimerShown = false')
              v-icon mdi-close
          v-card-text.pt-5
            .text-center.subtitle-1.mb-4(v-html="$t('common:medical.intro')")
            div.text-justify
              | {{ $t('common:medical.text') }}

      v-fab-transition
        v-btn(
          v-if='upBtnShown && showReturnToTop'
          fab
          fixed
          bottom
          :right='$vuetify.rtl'
          :left='!$vuetify.rtl'
          small
          :depressed='this.$vuetify.breakpoint.mdAndUp'
          @click='$vuetify.goTo(0, scrollOpts)'
          color='primary'
          dark
          :style='upBtnPosition'
          :aria-label='$t(`common:actions.returnToTop`)'
        )
          v-icon mdi-arrow-up
</template>

<script>
import { StatusIndicator } from 'vue-status-indicator'
import Tabset from './tabset.vue'
import NavSidebar from './nav-sidebar.vue'
import NavFooter from './nav-footer.vue'
import SideComments from './side-comments.vue'
import SearchOverlay from './search-overlay.vue'
import Prism from 'prismjs'
import mermaid from 'mermaid'
import { get, sync } from 'vuex-pathify'
import _ from 'lodash'
import ClipboardJS from 'clipboard'
import Vue from 'vue'
import LongeviDataTable from './longevidata-widget.vue'
import LongevidenceEffect from './longevidence-effect.vue'
import LongevidenceScore from './longevidence-score.vue'
import { injectTubular3DDna } from './tubular-3d-dna.js'
import { injectWaveRibbonDna } from './wave-ribbon-dna.js'
import { injectHeroPathsOverlay } from './hero-paths-overlay.js'

Vue.component('LongeviDataTable', LongeviDataTable)
Vue.component('LongevidenceEffect', LongevidenceEffect)
Vue.component('LongevidenceScore', LongevidenceScore)

Vue.component('Tabset', Tabset)

Prism.plugins.autoloader.languages_path = '/_assets/js/prism/'
Prism.plugins.NormalizeWhitespace.setDefaults({
  'remove-trailing': true,
  'remove-indent': true,
  'left-trim': true,
  'right-trim': true,
  'remove-initial-line-feed': true,
  'tabs-to-spaces': 2
})
Prism.plugins.toolbar.registerButton('copy-to-clipboard', (env) => {
  let linkCopy = document.createElement('button')
  linkCopy.textContent = 'Copy'

  const clip = new ClipboardJS(linkCopy, {
    text: () => { return env.code }
  })

  clip.on('success', () => {
    linkCopy.textContent = 'Copied!'
    resetClipboardText()
  })
  clip.on('error', () => {
    linkCopy.textContent = 'Press Ctrl+C to copy'
    resetClipboardText()
  })

  return linkCopy

  function resetClipboardText() {
    setTimeout(() => {
      linkCopy.textContent = 'Copy'
    }, 5000)
  }
})

export default {
  components: {
    NavSidebar,
    NavFooter,
    StatusIndicator,
    SideComments,
    SearchOverlay
  },
  props: {
    pageId: {
      type: Number,
      default: 0
    },
    locale: {
      type: String,
      default: 'en'
    },
    path: {
      type: String,
      default: 'home'
    },
    title: {
      type: String,
      default: 'Untitled Page'
    },
    description: {
      type: String,
      default: ''
    },
    createdAt: {
      type: String,
      default: ''
    },
    updatedAt: {
      type: String,
      default: ''
    },
    tags: {
      type: Array,
      default: () => ([])
    },
    authorName: {
      type: String,
      default: 'Unknown'
    },
    authorId: {
      type: Number,
      default: 0
    },
    editor: {
      type: String,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: false
    },
    toc: {
      type: String,
      default: ''
    },
    sidebar: {
      type: String,
      default: ''
    },
    navMode: {
      type: String,
      default: 'MIXED'
    },
    commentsEnabled: {
      type: Boolean,
      default: false
    },
    tocEnabled: {
      type: Boolean,
      default: true
    },
    tagsEnabled: {
      type: Boolean,
      default: true
    },
    historyEnabled: {
      type: Boolean,
      default: true
    },
    effectivePermissions: {
      type: String,
      default: ''
    },
    searchEnabled: {
      type: Boolean,
      default: true
    },
    commentsExternal: {
      type: Boolean,
      default: false
    },
    editShortcuts: {
      type: String,
      default: ''
    },
    filename: {
      type: String,
      default: ''
    },
    membershipMaxRows: {
      type: Number,
      default: null
    },
    membershipTierKey: {
      type: String,
      default: 'free'
    },
    initialBreadcrumbs: {
      type: String,
      default: ''
    },
    limitReached: {
      type: Boolean,
      default: false
    },
    remainingViews: {
      type: Number,
      default: -1
    },
    softPrompt: {
      type: Boolean,
      default: false
    },
    warnReached: {
      type: Boolean,
      default: false
    },
    ctaEnabled: {
      type: Boolean,
      default: false
    },
    ctaVariant: {
      type: String,
      default: ''
    },
    ctaFrequencyHours: {
      type: Number,
      default: 24
    }
  },
  provide() {
    return {
      membershipInfo: {
        maxRows: this.membershipMaxRows,
        tierKey: this.membershipTierKey
      }
    }
  },
  data() {
    return {
      navShown: false,
      navExpanded: false,
      upBtnShown: false,
      pageEditFab: false,
      commentsShown: false,
      scrollOpts: {
        duration: 1500,
        offset: 0,
        easing: 'easeInOutCubic'
      },
      scrollStyle: {
        vuescroll: {},
        scrollPanel: {
          initialScrollX: 0.01, // fix scrollbar not disappearing on load
          scrollingX: false,
          speed: 50
        },
        rail: {
          gutterOfEnds: '2px'
        },
        bar: {
          onlyShowBarOnScroll: false,
          background: '#42A5F5',
          hoverStyle: {
            background: '#64B5F6'
          }
        }
      },
      winWidth: 0,
      ctaSoftPromptVisible: false,
      currentComments: [],
      medicalDisclaimerShown: false,
      searchMenuShown: false,
      searchMenuMobileShown: false,
      searchQuery: '',
      searchMenuWidth: null,
      searchOutsideClickHandler: null,
      dnaController: null,
      customHero: null
    }
  },
  computed: {
    isAuthenticated: get('user/authenticated'),
    commentsCount: get('page/commentsCount'),
    commentsPerms: get('page/effectivePermissions@comments'),
    editShortcutsObj: get('page/editShortcuts'),
    breadcrumbs: get('page/breadcrumbs'),
    rating: {
      get () {
        return 3.5
      },
      set (val) {

      }
    },
    pageUrl () { return window.location.href },
    upBtnPosition () {
      if (this.$vuetify.breakpoint.mdAndUp) {
        return this.$vuetify.rtl ? `right: 235px;` : `left: 235px;`
      } else {
        return this.$vuetify.rtl ? `right: 65px;` : `left: 65px;`
      }
    },
    sidebarDecoded () {
      return JSON.parse(Buffer.from(this.sidebar, 'base64').toString())
    },
    tocDecoded () {
      return JSON.parse(Buffer.from(this.toc, 'base64').toString())
    },
    tocPosition: get('site/tocPosition'),
    showReturnToTop: get('site/showReturnToTop'),
    hasAdminPermission: get('page/effectivePermissions@system.manage'),
    hasWritePagesPermission: get('page/effectivePermissions@pages.write'),
    hasManagePagesPermission: get('page/effectivePermissions@pages.manage'),
    hasDeletePagesPermission: get('page/effectivePermissions@pages.delete'),
    hasReadSourcePermission: get('page/effectivePermissions@source.read'),
    hasReadHistoryPermission: get('page/effectivePermissions@history.read'),
    canReadHistory () {
      return this.historyEnabled && this.hasReadHistoryPermission
    },
    hasAnyPagePermissions () {
      return this.hasAdminPermission || this.hasWritePagesPermission || this.hasManagePagesPermission ||
        this.hasDeletePagesPermission || this.hasReadSourcePermission || this.canReadHistory
    },
    printView: sync('site/printView'),
    heroImage () {
      if (this.customHero && this.customHero.image) {
        return this.customHero.image
      }
      return null
    },
    heroTitle () {
      return (this.customHero && this.customHero.title) || this.title
    },
    heroSubtitle () {
      return (this.customHero && this.customHero.subtitle) || this.description
    },
    editMenuExternalUrl () {
      if (this.editShortcutsObj.editMenuBar && this.editShortcutsObj.editMenuExternalBtn) {
        return this.editShortcutsObj.editMenuExternalUrl.replace('{filename}', this.filename)
      } else {
        return ''
      }
    },
    remainingViewsText () {
      if (this.remainingViews === 1) {
        return this.$t('common:conversion.remainingOne')
      }
      if (this.remainingViews > 1) {
        return this.$t('common:conversion.remaining', { count: this.remainingViews })
      }
      return ''
    },
    showSoftPrompt () {
      return this.ctaSoftPromptVisible && this.ctaEnabled && !this.printView
    },
    showLimitCta () {
      return this.limitReached && this.ctaEnabled && !this.printView
    }
  },
  created() {
    this.$store.set('page/authorId', this.authorId)
    this.$store.set('page/authorName', this.authorName)
    this.$store.set('page/createdAt', this.createdAt)
    this.$store.set('page/description', this.description)
    this.$store.set('page/isPublished', this.isPublished)
    this.$store.set('page/id', this.pageId)
    this.$store.set('page/locale', this.locale)
    this.$store.set('page/path', this.path)
    this.$store.set('page/tags', this.tags)
    this.$store.set('page/title', this.title)
    this.$store.set('page/editor', this.editor)
    this.$store.set('page/updatedAt', this.updatedAt)
    if (this.effectivePermissions) {
      this.$store.set('page/effectivePermissions', JSON.parse(Buffer.from(this.effectivePermissions, 'base64').toString()))
    }
    if (this.editShortcuts) {
      this.$store.set('page/editShortcuts', JSON.parse(Buffer.from(this.editShortcuts, 'base64').toString()))
    }
    if (this.initialBreadcrumbs) {
      this.$store.set('page/breadcrumbs', JSON.parse(Buffer.from(this.initialBreadcrumbs, 'base64').toString()))
    }

    this.$store.set('page/mode', 'view')
  },
  mounted () {
    if (this.$vuetify.theme.dark) {
      this.scrollStyle.bar.background = '#424242'
    }

    this.initCtaVisibility()
    this.$nextTick(() => {
      this.extractHeroFromContent()
    })

    if (this.path === 'home') {
      document.documentElement.style.setProperty('--hero-legacy-image', "url('/images/home_hero_background4.jpeg')")
      this.injectDnaHelix()
    }

    // -> Check side navigation visibility
    this.handleSideNavVisibility()
    window.addEventListener('resize', _.debounce(() => {
      this.handleSideNavVisibility()
      this.updateSearchMenuWidth()
    }, 500))

    // -> Highlight Code Blocks
    Prism.highlightAllUnder(this.$refs.container)

    // -> Hydrate LongeviData Widgets
    this.$nextTick(() => {
      this.hydrateLongeviDataWidgets()
    })

    // -> Handle medical disclaimer pills
    this.$nextTick(() => {
      this.$refs.container.querySelectorAll('.medical-disclaimer-pill').forEach(el => {
        el.textContent = this.$t('common:medical.pill')
        el.onclick = ev => {
          ev.preventDefault()
          ev.stopPropagation()
          this.medicalDisclaimerShown = true
        }
      })
    })

    // -> Render Mermaid diagrams
    mermaid.mermaidAPI.initialize({
      startOnLoad: true,
      theme: this.$vuetify.theme.dark ? `dark` : `default`
    })

    // -> Handle anchor scrolling
    if (window.location.hash && window.location.hash.length > 1) {
      const decodedHash = decodeURIComponent(window.location.hash)
      if (decodedHash.indexOf('#discussion') === 0) {
        this.commentsShown = true
        this.$nextTick(() => {
          if (decodedHash === '#discussion-new') {
            document.querySelector('#discussion-new')?.focus()
          }
        })
      } else {
        if (document.readyState === 'complete') {
          this.$nextTick(() => {
            this.$vuetify.goTo(decodedHash, this.scrollOpts)
          })
        } else {
          window.addEventListener('load', () => {
            this.$vuetify.goTo(decodedHash, this.scrollOpts)
          })
        }
      }
    }

    // -> Handle anchor links within the page contents
    this.$nextTick(() => {
      this.$refs.container.querySelectorAll(`a[href^="#"], a[href^="${window.location.href.replace(window.location.hash, '')}#"]`).forEach(el => {
        el.onclick = ev => {
          ev.preventDefault()
          ev.stopPropagation()
          if (ev.currentTarget.hash && ev.currentTarget.hash.indexOf('#discussion') === 0) {
            this.commentsShown = true
            this.$nextTick(() => {
              if (ev.currentTarget.hash === '#discussion-new') {
                document.querySelector('#discussion-new')?.focus()
              }
            })
            return
          }
          this.$vuetify.goTo(decodeURIComponent(ev.currentTarget.hash), this.scrollOpts)
        }
      })

      window.boot.notify('page-ready')
    })

    this.$root.$on('open-comment-sidebar', this.openCommentSidebar)
    this.$root.$on('comments-updated', this.handleCommentsLoaded)

    this.updateSearchMenuWidth()

    this.searchOutsideClickHandler = (event) => {
      if (!this.searchMenuShown) {
        return
      }
      const target = event.target
      const inputEl = this.$refs.headerSearchInput && this.$refs.headerSearchInput.$el
      const menuEls = document.querySelectorAll('.v-menu__content.search-results-menu')
      if (inputEl && inputEl.contains(target)) {
        return
      }
      for (let i = 0; i < menuEls.length; i += 1) {
        if (menuEls[i].contains(target)) {
          return
        }
      }
      this.searchMenuShown = false
    }
    document.addEventListener('mousedown', this.searchOutsideClickHandler, true)
  },
  watch: {
    '$vuetify.theme.dark' (val) {
      if (this.dnaController && this.dnaController.updateTheme) {
        this.dnaController.updateTheme(val)
      }
    },
    searchMenuShown (value) {
      if (value) {
        this.updateSearchMenuWidth()
      }
    }
  },
  beforeDestroy () {
    this.$root.$off('open-comment-sidebar', this.openCommentSidebar)
    this.$root.$off('comments-updated', this.handleCommentsLoaded)
    if (this.searchOutsideClickHandler) {
      document.removeEventListener('mousedown', this.searchOutsideClickHandler, true)
    }
  },
  methods: {
    initCtaVisibility () {
      if (this.limitReached && this.ctaEnabled) {
        this.recordCtaShown()
        return
      }
      if (this.softPrompt && this.ctaEnabled && this.canShowCta()) {
        this.ctaSoftPromptVisible = true
        this.recordCtaShown()
      }
    },
    canShowCta () {
      if (!window || !window.localStorage) return true
      const lastShown = parseInt(window.localStorage.getItem('conversionCtaLastShown') || '0', 10)
      if (!lastShown) return true
      const hours = Math.max(1, this.ctaFrequencyHours || 24)
      return (Date.now() - lastShown) >= hours * 3600 * 1000
    },
    recordCtaShown () {
      if (!window || !window.localStorage) return
      window.localStorage.setItem('conversionCtaLastShown', Date.now().toString())
    },
    ctaSignIn () {
      window.location.assign('/login')
    },
    ctaRegister () {
      window.location.assign('/register')
    },
    updateSearchMenuWidth () {
      this.$nextTick(() => {
        const inputEl = this.$refs.headerSearchInput && this.$refs.headerSearchInput.$el
        if (inputEl) {
          this.searchMenuWidth = Math.round(inputEl.getBoundingClientRect().width)
        }
      })
    },
    goHome () {
      window.location.assign('/')
    },
    toggleNavigation () {
      this.navOpen = !this.navOpen
    },
    upBtnScroll () {
      const scrollOffset = window.pageYOffset || document.documentElement.scrollTop
      this.upBtnShown = scrollOffset > window.innerHeight * 0.33
    },
    print () {
      if (this.printView) {
        this.printView = false
      } else {
        this.printView = true
        this.$nextTick(() => {
          window.print()
        })
      }
    },
    pageEdit () {
      this.$root.$emit('pageEdit')
    },
    pageHistory () {
      this.$root.$emit('pageHistory')
    },
    pageSource () {
      this.$root.$emit('pageSource')
    },
    pageConvert () {
      this.$root.$emit('pageConvert')
    },
    pageDuplicate () {
      this.$root.$emit('pageDuplicate')
    },
    pageMove () {
      this.$root.$emit('pageMove')
    },
    pageDelete () {
      this.$root.$emit('pageDelete')
    },
    handleSideNavVisibility () {
      if (window.innerWidth === this.winWidth) { return }
      this.winWidth = window.innerWidth
      if (this.$vuetify.breakpoint.mdAndUp) {
        this.navShown = true
      } else {
        this.navShown = false
      }
    },
    goToComments (focusNewComment = false) {
      this.commentsShown = true
      if (!focusNewComment) return
      this.$nextTick(() => {
        document.querySelector('#discussion-new')?.focus()
      })
    },
    openCommentSidebar (commentId) {
      this.commentsShown = true
      this.$nextTick(() => {
        const target = `#comment-post-id-${commentId}`
        const commentEl = document.querySelector(target)
        if (commentEl) {
          this.$vuetify.goTo(commentEl, this.scrollOpts)
        }
      })
    },
    handleCommentsLoaded (comments) {
      this.currentComments = Array.isArray(comments) ? comments : []
    },
    extractHeroFromContent () {
      const container = this.$refs.container
      if (!container) return
      const heroEl = container.querySelector('hero-header')
      if (!heroEl) return
      this.customHero = {
        image: heroEl.getAttribute('image') || '',
        title: heroEl.getAttribute('title') || '',
        subtitle: heroEl.getAttribute('subtitle') || ''
      }
      heroEl.remove()
    },
    injectDnaHelix () {
      const DNA_VERSION = 'tubular-3d' // Options: 'tubular-3d', 'wave-ribbon'

      this.$nextTick(() => {
        const heroSection = document.querySelector('.hero-section--dna')
        if (!heroSection) return

        if (DNA_VERSION === 'tubular-3d') {
          this.dnaController = injectTubular3DDna(heroSection, this.$vuetify.theme.dark)
        } else if (DNA_VERSION === 'wave-ribbon') {
          injectWaveRibbonDna(heroSection)
        }

        injectHeroPathsOverlay(heroSection)
      })
    },
    hydrateLongeviDataWidgets () {
      if (!this.$refs.container) return
      
      const widgets = this.$refs.container.querySelectorAll('longevidata-table:not(.js-hydrated)')
      if (widgets.length === 0) return

      widgets.forEach(el => {
        el.classList.add('js-hydrated')
        
        // Extract attributes
        const intervention = el.getAttribute('intervention')
        const condition = el.getAttribute('condition')
        const biomarker = el.getAttribute('biomarker')
        const name = el.getAttribute('name')
        const initialData = el.getAttribute('data-initial')
        
        // Create mount point inside the element (clearing static content)
        el.innerHTML = ''
        const mountPoint = document.createElement('div')
        el.appendChild(mountPoint)
        
        const ComponentClass = Vue.extend(LongeviDataTable)
        const instance = new ComponentClass({
          propsData: {
            intervention,
            condition,
            biomarker,
            name,
            initialData
          },
          provide: {
            membershipInfo: {
              maxRows: this.membershipMaxRows,
              tierKey: this.membershipTierKey
            }
          }
        })
        
        instance.$mount(mountPoint)
      })
    }
  }
}
</script>

<style lang="scss">

.breadcrumbs-nav {
  .v-btn {
    min-width: 0;
    &__content {
      text-transform: none;
    }
  }
  .v-breadcrumbs__divider:nth-child(2n) {
    padding: 0 6px;
  }
  .v-breadcrumbs__divider:nth-child(2) {
    padding: 0 6px 0 12px;
  }
}

.page-col-sd {
  margin-top: -90px;
  align-self: flex-start;
  position: sticky;
  top: 64px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  -ms-overflow-style: none;
}

.page-col-sd::-webkit-scrollbar {
  display: none;
}

.page-comments-scrim {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 2004;
}

.page-comments-sidebar {
  position: fixed;
  top: 0;
  // Keep fully off-screen when closed (including shadow), and don't intercept scroll events.
  // Use transforms so the hidden sidebar cannot increase document scrollWidth (which can break scrolling).
  right: 0;
  width: 420px;
  max-width: 100vw;
  height: 100vh;
  z-index: 2005;
  background: white;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 160ms ease;
  will-change: transform;
  box-shadow: none;
  pointer-events: none;
  visibility: hidden;

  @at-root .theme--dark & {
    background: #1e1e1e;
  }

  &.is-open {
    transform: translateX(0);
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    pointer-events: auto;
    visibility: visible;
  }
}

.page-comments-sidebar-header {
  padding-top: calc(env(safe-area-inset-top) + 10px);
  padding-left: 12px;
  padding-right: 6px;
  flex: 0 0 auto;
}

.page-comments-sidebar-content {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px;
}

@media (max-width: 600px) {
  .page-comments-sidebar {
    width: 100vw;
  }
}

@media (max-width: 600px) {
  .page-comments-drawer {
    width: 100% !important;
    max-width: 100% !important;
  }
}

.page-header-section {
  position: relative;

  > .is-page-header {
    position: relative;
  }

  .page-header-headings {
    min-height: 52px;
    display: flex;
    justify-content: center;
    flex-direction: column;
  }

  .page-edit-shortcuts {
    position: absolute;
    bottom: -33px;
    right: 10px;

    .v-btn {
      border-right: 1px solid #DDD !important;
      border-bottom: 1px solid #DDD !important;
      border-radius: 0;
      color: #777;
      background-color: #FFF !important;

      @at-root .theme--dark & {
        background-color: #222 !important;
        border-right-color: #444 !important;
        border-bottom-color: #444 !important;
        color: #CCC;
      }

      .v-icon {
        color: mc('blue', '700');
      }

      &:first-child {
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
      }

      &:last-child {
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
      }
    }
  }
}

.longevidence-header-search {
  max-width: 400px;

  .v-input__slot {
    background-color: #ffffff !important;
    border: 1px solid rgba(0,0,0,0.1) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
  }

  input {
    color: #333 !important;
  }

  .v-icon {
    color: #666 !important;
  }
}

.theme--light .longevidence-header-search {
  .v-input__slot {
    background-color: #ffffff !important;
    border-color: rgba(0,0,0,0.1) !important;
  }

  input,
  .v-label {
    color: #333 !important;
  }

  .v-input__prepend-inner .v-icon {
    color: #666 !important;
  }
}

.medical-disclaimer-pill {
  background-color: #5e3c7d;
  color: white;
  font-size: 0.5em;
  padding: 4px 8px;
  border-radius: 12px;
  vertical-align: middle;
  margin-left: 10px;
  cursor: pointer;
  font-weight: normal;
  letter-spacing: normal;
  display: inline-block;
  line-height: normal;
  font-family: Roboto, sans-serif;

  &:hover {
    background-color: lighten(#5e3c7d, 10%);
  }
}

.contents.anon-view-limited {
  position: relative;
}

.anon-view-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 180px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.85));
  pointer-events: none;
  z-index: 2;

  @at-root .theme--dark & {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.85));
  }
}

.anon-view-cta {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 20px;
  display: flex;
  justify-content: center;
  z-index: 3;
  padding: 0 16px;
}

.anon-view-cta-card {
  max-width: 560px;
  width: 100%;
  padding: 20px 24px;
}

</style>
