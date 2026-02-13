<template lang="pug">
  v-app(v-scroll='upBtnScroll', :dark='$vuetify.theme.dark', :class='appClasses')
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
        v-row.category-hero-section(v-if='heroImage', :class='heroClasses', no-gutters, align='center', justify='center')
          v-container
            v-row.category-hero-row(align='stretch', justify='space-between')
              v-col.category-hero-title-col(cols='7', sm='7', md='7')
                h1.category-hero-title {{ heroTitle }}
                .category-hero-subtitle.opacity-70.category-hero-subtitle--desktop(v-if='heroSubtitle') {{ heroSubtitle }}
              v-col.category-hero-image-col(cols='5', sm='5', md='5')
                v-img.category-hero-image(:src='heroImage', max-height='250', contain)
            .category-hero-subtitle.opacity-70.category-hero-subtitle--mobile(v-if='heroSubtitle') {{ heroSubtitle }}
        v-row.page-header-section.page-header-section--fixed-height(v-else, no-gutters, align-content='center')
          v-col.page-col-content.is-page-header.page-header-col-auto-margin(
            :offset-xl='tocEnabled && tocPosition === `left` ? 2 : 0'
            :offset-lg='tocEnabled && tocPosition === `left` ? 3 : 0'
            :xl='tocEnabled && tocPosition === `right` ? 10 : false'
            :lg='tocEnabled && tocPosition === `right` ? 9 : false'
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
      v-container.page-layout-shell(fluid, grid-list-xl, class='pa-0')
        v-layout(row)
          v-flex.page-col-sd.toc-sidebar(
            v-if='tocEnabled && tocPosition !== `off` && tocDecoded.length > 0 && $vuetify.breakpoint.lgAndUp'
            lg4
            xl3
            )
            .page-toc-sidebar
              .overline.page-toc-sidebar-title(:class='$vuetify.theme.dark ? `blue--text text--lighten-2` : `primary--text`') {{$t('common:page.toc')}}
              v-list.page-toc-sidebar-list.pb-3(nav, :class='$vuetify.theme.dark ? `darken-3-d3` : ``')
                template(v-for='(tocItem, tocIdx) in tocDecoded')
                  .page-toc-group(:key='`toc-group-${tocItemKey(tocItem, tocIdx)}`')
                    v-list-item.page-toc-item.page-toc-item--root(
                      :class='{ "is-primary": tocIdx === 0 }'
                      @click='goToTocAnchor(tocItem.anchor)'
                      )
                      v-icon.page-toc-item__icon(size='18') mdi-text-box-outline
                      v-list-item-content.page-toc-item__content
                        v-list-item-title.page-toc-item__title {{tocItem.title}}
                      button.page-toc-toggle-btn(
                        v-if='isTocItemExpandable(tocItem)'
                        type='button'
                        :aria-label='isTocItemExpanded(tocItem, tocIdx) ? `Collapse section` : `Expand section`'
                        @click.stop='toggleTocItem(tocItem, tocIdx)'
                        )
                        v-icon.page-toc-item__toggle(
                          :class='{ "is-open": isTocItemExpanded(tocItem, tocIdx), "is-rtl": $vuetify.rtl }'
                          size='22'
                          ) {{ $vuetify.rtl ? `mdi-chevron-left` : `mdi-chevron-right` }}
                    v-expand-transition
                      .page-toc-children(v-if='isTocItemExpandable(tocItem) && isTocItemExpanded(tocItem, tocIdx)')
                        template(v-for='(tocSubItem, tocSubIdx) in tocItem.children')
                          v-list-item.page-toc-item.page-toc-item--child(
                            :key='`toc-sub-item-${tocIdx}-${tocSubIdx}-${tocSubItem.anchor || tocSubItem.title}`'
                            @click='goToTocAnchor(tocSubItem.anchor)'
                            )
                            v-list-item-content.page-toc-item__content
                              v-list-item-title.page-toc-item__title {{tocSubItem.title}}
              .page-toc-tags(v-if='tagsEnabled && tags.length > 0')
                .overline.page-toc-sidebar-title(:class='$vuetify.theme.dark ? `teal--text text--lighten-3` : `teal--text text--darken-1`') {{$t('common:page.tags')}}
                v-chip.page-toc-tag-chip.mr-1.mb-1(
                  label
                  :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                  v-for='tag in tags'
                  :href='`/t/` + tag.tag'
                  :key='`tag-` + tag.tag'
                  )
                  v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', left, small) mdi-tag
                  span(:class='$vuetify.theme.dark ? `teal--text text--lighten-5` : `teal--text text--darken-2`') {{tag.title}}
                v-chip.page-toc-tag-chip.mr-1.mb-1(
                  label
                  :color='$vuetify.theme.dark ? `teal darken-1` : `teal lighten-5`'
                  :href='`/t/` + tags.map(t => t.tag).join(`/`)'
                  :aria-label='$t(`common:page.tagsMatching`)'
                  )
                  v-icon(:color='$vuetify.theme.dark ? `teal lighten-3` : `teal`', size='20') mdi-tag-multiple

          v-flex.page-col-content.pa-0(
            xs12
            :lg='contentLgColumns'
            :xl='contentXlColumns'
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
            .page-infobox-mobile(
              v-if='hasInfoboxContent && $vuetify.breakpoint.mdAndDown'
              )
              .page-infobox-mobile-content(
                ref='mobileInfoboxContainer'
                v-html='detachedInfoboxMarkup'
                )
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
          v-flex.page-col-infobox.right-sidebar(
            v-if='hasDesktopInfoboxColumn'
            lg4
            xl3
            )
            .page-infobox-sidebar
              .page-infobox-sidebar-content(v-html='detachedInfoboxMarkup')
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
          v-card-title.headline.white--text.medical-disclaimer-title-bar
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
          class='page-up-btn'
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
import LongeviDataSafety from './longevidata-safety-widget.vue'
import ResearchSnapshot from './research-snapshot.vue'
import LongevidenceEffect from './longevidence-effect.vue'
import LongevidenceScore from './longevidence-score.vue'
import { injectTubular3DDna } from './tubular-3d-dna.js'
import { injectWaveRibbonDna } from './wave-ribbon-dna.js'
import { injectHeroPathsOverlay } from './hero-paths-overlay.js'

// Suppress "Unknown custom element" warning for longevidata-table
// as we hydrate it manually
Vue.config.ignoredElements = [
  'longevidata-table',
  'longevidata-safety',
  'research-snapshot',
  'hero-header',
  ...Vue.config.ignoredElements || []
]

Vue.component('LongeviDataTable', LongeviDataTable)
Vue.component('LongeviDataSafety', LongeviDataSafety)
Vue.component('ResearchSnapshot', ResearchSnapshot)
Vue.component('LongevidenceEffect', LongevidenceEffect)
Vue.component('Effect', LongevidenceEffect)
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
      tocExpanded: {},
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
      customHero: null,
      detachedInfoboxMarkup: ''
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
    sidebarDecoded () {
      return JSON.parse(Buffer.from(this.sidebar, 'base64').toString())
    },
    tocDecoded () {
      const tocTree = JSON.parse(Buffer.from(this.toc, 'base64').toString())
      return this.normalizeTocTree(tocTree)
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
    appClasses () {
      const classes = [
        this.$vuetify.rtl ? 'is-rtl' : 'is-ltr'
      ]

      if (this.path === 'home') {
        classes.push('custom-home-page')
      }

      if (this.pageLayoutClass) {
        classes.push(`le-page--${this.pageLayoutClass}`)
      }

      return classes
    },
    heroClasses () {
      const classes = ['le-hero']

      if (this.heroLayoutClass) {
        classes.push(`le-hero--${this.heroLayoutClass}`)
      }

      return classes
    },
    pageTagTokens () {
      if (!Array.isArray(this.tags)) {
        return []
      }

      return this.tags
        .map(tag => {
          if (_.isString(tag)) {
            return tag
          }
          if (tag && _.isString(tag.tag)) {
            return tag.tag
          }
          return ''
        })
        .map(this.normalizeLayoutTagToken)
        .filter(Boolean)
    },
    pageTagLayout () {
      const explicitLayout = this.pageTagTokens.find(token => token.indexOf('layout:') === 0 || token.indexOf('layout-') === 0)
      if (explicitLayout) {
        return this.normalizeLayoutTag(explicitLayout)
      }

      const legacyLayout = this.pageTagTokens.find(token => ['topic', 'topic-page', 'category', 'category-page', 'taxonomy', 'taxonomy-page'].includes(token))
      return this.normalizeLayoutTag(legacyLayout)
    },
    pageLayoutClass () {
      const explicitPageLayout = this.normalizeLayoutTag(this.customHero && this.customHero.pageLayout)
      if (explicitPageLayout) {
        return explicitPageLayout
      }

      if (this.pageTagLayout) {
        return this.pageTagLayout
      }

      return ''
    },
    heroLayoutClass () {
      const explicitHeroLayout = this.normalizeLayoutTag(this.customHero && this.customHero.heroLayout)
      if (explicitHeroLayout) {
        return explicitHeroLayout
      }

      return this.pageLayoutClass
    },
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
    },
    hasInfoboxContent () {
      return this.detachedInfoboxMarkup.trim().length > 0
    },
    hasDesktopInfoboxColumn () {
      return this.hasInfoboxContent && this.$vuetify.breakpoint.lgAndUp
    },
    hasDesktopTocColumn () {
      return this.tocEnabled && this.tocPosition !== 'off' && this.tocDecoded.length > 0 && this.$vuetify.breakpoint.lgAndUp
    },
    contentLgColumns () {
      if (this.hasDesktopTocColumn && this.hasDesktopInfoboxColumn) {
        return 4
      }
      if (this.hasDesktopTocColumn) {
        return 8
      }
      if (this.hasDesktopInfoboxColumn) {
        return 8
      }
      return false
    },
    contentXlColumns () {
      if (this.hasDesktopTocColumn && this.hasDesktopInfoboxColumn) {
        return 6
      }
      if (this.hasDesktopTocColumn) {
        return 9
      }
      if (this.hasDesktopInfoboxColumn) {
        return 9
      }
      return false
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
      this.$nextTick(() => {
        this.extractInfoboxesFromContent()
      })
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
    tocDecoded: {
      handler () {
        this.syncTocExpandedState()
      },
      immediate: true
    },
    '$vuetify.theme.dark' (val) {
      if (this.dnaController && this.dnaController.updateTheme) {
        this.dnaController.updateTheme(val)
      }
    },
    searchMenuShown (value) {
      if (value) {
        this.updateSearchMenuWidth()
      }
    },
    detachedInfoboxMarkup () {
      this.$nextTick(() => {
        this.setupMobileInfoboxToggle()
      })
    },
    '$vuetify.breakpoint.mdAndDown' (isMobile) {
      if (isMobile) {
        this.$nextTick(() => {
          this.setupMobileInfoboxToggle()
        })
      } else {
        this.teardownMobileInfoboxToggle()
      }
    }
  },
  beforeDestroy () {
    this.$root.$off('open-comment-sidebar', this.openCommentSidebar)
    this.$root.$off('comments-updated', this.handleCommentsLoaded)
    this.teardownMobileInfoboxToggle()
    if (this.searchOutsideClickHandler) {
      document.removeEventListener('mousedown', this.searchOutsideClickHandler, true)
    }
  },
  methods: {
    tocItemKey (tocItem, tocIdx) {
      const anchorKey = _.isString(tocItem.anchor) ? tocItem.anchor.replace(/^#/, '') : ''
      if (anchorKey) {
        return anchorKey
      }

      return `${tocIdx}-${this.normalizeTocLabel(tocItem.title)}`
    },
    isTocItemExpandable (tocItem) {
      return Array.isArray(tocItem.children) && tocItem.children.length > 0
    },
    isTocItemExpanded (tocItem, tocIdx) {
      if (!this.isTocItemExpandable(tocItem)) {
        return false
      }

      const itemKey = this.tocItemKey(tocItem, tocIdx)
      return !!this.tocExpanded[itemKey]
    },
    toggleTocItem (tocItem, tocIdx) {
      if (!this.isTocItemExpandable(tocItem)) {
        return
      }

      const itemKey = this.tocItemKey(tocItem, tocIdx)
      this.$set(this.tocExpanded, itemKey, !this.tocExpanded[itemKey])
    },
    syncTocExpandedState () {
      const nextState = {}
      let hasOpenByDefault = false

      this.tocDecoded.forEach((tocItem, tocIdx) => {
        if (!this.isTocItemExpandable(tocItem)) {
          return
        }

        const itemKey = this.tocItemKey(tocItem, tocIdx)
        if (_.isBoolean(this.tocExpanded[itemKey])) {
          nextState[itemKey] = this.tocExpanded[itemKey]
          if (this.tocExpanded[itemKey]) {
            hasOpenByDefault = true
          }
          return
        }

        const shouldOpen = !hasOpenByDefault
        nextState[itemKey] = shouldOpen
        if (shouldOpen) {
          hasOpenByDefault = true
        }
      })

      this.tocExpanded = nextState
    },
    goToTocAnchor (anchor) {
      if (!anchor) {
        return
      }

      this.$vuetify.goTo(anchor, this.scrollOpts)
    },
    normalizeTocTree (tocTree) {
      if (!Array.isArray(tocTree)) {
        return []
      }

      const sanitizedTree = tocTree
        .map(this.normalizeTocNode)
        .filter(Boolean)

      if (this.shouldPromoteTocChildren(sanitizedTree)) {
        return sanitizedTree[0].children
      }

      return sanitizedTree
    },
    normalizeTocNode (node) {
      if (!node || !_.isString(node.title)) {
        return null
      }

      return {
        title: node.title,
        anchor: _.isString(node.anchor) ? node.anchor : '',
        children: Array.isArray(node.children) ? node.children.map(this.normalizeTocNode).filter(Boolean) : []
      }
    },
    shouldPromoteTocChildren (tocTree) {
      if (tocTree.length !== 1 || !tocTree[0].children.length) {
        return false
      }

      return this.normalizeTocLabel(tocTree[0].title) === this.normalizeTocLabel(this.title)
    },
    normalizeTocLabel (value) {
      return String(value || '')
        .toLowerCase()
        .replace(/&amp;/g, '&')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
    },
    normalizeLayoutTagToken (value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9:-]/g, '')
    },
    normalizeLayoutTag (value) {
      const token = this.normalizeLayoutTagToken(value)
      if (!token) {
        return ''
      }

      if (token.indexOf('layout:') === 0 || token.indexOf('layout-') === 0) {
        return token.slice(7)
      }

      if (token === 'topic-page' || token === 'category-page' || token === 'taxonomy-page') {
        return token.replace('-page', '')
      }

      return token
    },
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
        subtitle: heroEl.getAttribute('subtitle') || '',
        heroLayout: heroEl.getAttribute('layout') || heroEl.getAttribute('hero-layout') || heroEl.getAttribute('tag') || '',
        pageLayout: heroEl.getAttribute('page-layout') || ''
      }
      heroEl.remove()
    },
    extractInfoboxesFromContent () {
      const container = this.$refs.container
      if (!container) {
        return
      }

      const infoboxNodes = Array.from(container.querySelectorAll('.infobox, .quick-facts'))
      if (infoboxNodes.length === 0) {
        this.detachedInfoboxMarkup = ''
        return
      }

      const markupParts = []
      infoboxNodes.forEach(node => {
        markupParts.push(node.outerHTML)
        node.classList.add('le-detached-infobox-source')
      })

      this.detachedInfoboxMarkup = markupParts.join('\n')
      this.$nextTick(() => {
        this.setupMobileInfoboxToggle()
      })
    },
    setupMobileInfoboxToggle () {
      if (!this.$vuetify.breakpoint.mdAndDown) {
        return
      }

      const container = this.$refs.mobileInfoboxContainer
      if (!container) {
        return
      }

      const infoboxes = container.querySelectorAll('.infobox, .quick-facts')
      infoboxes.forEach(infobox => {
        const header = infobox.querySelector('.infobox-name, .name, .quick-facts-header')
        if (!header) {
          return
        }

        infobox.classList.add('is-mobile-collapsible')
        if (!infobox.dataset.mobileCollapsedInitialized) {
          infobox.classList.add('is-collapsed-mobile')
          infobox.dataset.mobileCollapsedInitialized = '1'
        }

        if (header.dataset.mobileInfoboxToggleBound === '1') {
          return
        }

        header.dataset.mobileInfoboxToggleBound = '1'
        header.setAttribute('tabindex', '0')
        header.addEventListener('click', this.handleMobileInfoboxHeaderClick)
        header.addEventListener('keydown', this.handleMobileInfoboxHeaderKeydown)
      })
    },
    teardownMobileInfoboxToggle () {
      const container = this.$refs.mobileInfoboxContainer
      if (!container) {
        return
      }

      const headers = container.querySelectorAll('.infobox-name, .name, .quick-facts-header')
      headers.forEach(header => {
        if (header.dataset.mobileInfoboxToggleBound === '1') {
          header.removeEventListener('click', this.handleMobileInfoboxHeaderClick)
          header.removeEventListener('keydown', this.handleMobileInfoboxHeaderKeydown)
          delete header.dataset.mobileInfoboxToggleBound
        }
        header.removeAttribute('tabindex')
      })

      const infoboxes = container.querySelectorAll('.infobox, .quick-facts')
      infoboxes.forEach(infobox => {
        infobox.classList.remove('is-mobile-collapsible')
        infobox.classList.remove('is-collapsed-mobile')
        delete infobox.dataset.mobileCollapsedInitialized
      })
    },
    handleMobileInfoboxHeaderClick (event) {
      if (!this.$vuetify.breakpoint.mdAndDown) {
        return
      }

      const infobox = event.currentTarget.closest('.infobox, .quick-facts')
      if (!infobox) {
        return
      }

      infobox.classList.toggle('is-collapsed-mobile')
    },
    handleMobileInfoboxHeaderKeydown (event) {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }

      event.preventDefault()
      this.handleMobileInfoboxHeaderClick(event)
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

      this.hydrateTableWidgets()
      this.hydrateSafetyWidgets()
      this.hydrateSnapshotWidgets()
      this.hydrateMetricWidgets()
    },
    hydrateSnapshotWidgets () {
      const widgets = this.$refs.container.querySelectorAll('research-snapshot:not(.js-hydrated)')
      if (widgets.length === 0) return

      widgets.forEach(el => {
        el.classList.add('js-hydrated')
        const topic = el.getAttribute('topic')
        
        el.innerHTML = ''
        const mountPoint = document.createElement('div')
        el.appendChild(mountPoint)
        
        const ComponentClass = Vue.extend(ResearchSnapshot)
        const instance = new ComponentClass({
          propsData: { topic },
          parent: this
        })
        instance.$mount(mountPoint)
      })
    },
    hydrateTableWidgets () {
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

        // Handle browser "hoisting" behavior where block-level static content (div)
        // gets forced out of the custom element (if treated as inline) or parent <p>.
        // This causes the static table to appear *below* the dynamic one.
        const cleanupHoisted = (node) => {
          if (node && node.nodeType === 1 && node.classList.contains('longevidata-widget-static')) {
            node.remove()
            return true
          }
          return false
        }

        // Check immediate sibling
        if (!cleanupHoisted(el.nextElementSibling)) {
          // Check parent's sibling (if wrapped in <p>)
          if (el.parentElement.tagName === 'P') {
            cleanupHoisted(el.parentElement.nextElementSibling)
          }
        }

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
          parent: this
        })
        
        instance.$mount(mountPoint)
      })
    },
    hydrateSafetyWidgets () {
      const widgets = this.$refs.container.querySelectorAll('longevidata-safety:not(.js-hydrated)')
      if (widgets.length === 0) return

      widgets.forEach(el => {
        el.classList.add('js-hydrated')

        const intervention = el.getAttribute('intervention')
        const condition = el.getAttribute('condition')
        const name = el.getAttribute('name')
        const initialData = el.getAttribute('data-initial')

        el.innerHTML = ''

        const cleanupHoisted = (node) => {
          if (node && node.nodeType === 1 && node.classList.contains('longevidata-safety-widget-static')) {
            node.remove()
            return true
          }
          return false
        }

        if (!cleanupHoisted(el.nextElementSibling)) {
          if (el.parentElement.tagName === 'P') {
            cleanupHoisted(el.parentElement.nextElementSibling)
          }
        }

        const mountPoint = document.createElement('div')
        el.appendChild(mountPoint)

        const ComponentClass = Vue.extend(LongeviDataSafety)
        const instance = new ComponentClass({
          propsData: {
            intervention,
            condition,
            name,
            initialData
          },
          parent: this
        })

        instance.$mount(mountPoint)
      })
    },
    hydrateMetricWidgets () {
      const effectWidgets = this.$refs.container.querySelectorAll('effect:not(.js-hydrated), longevidence-effect:not(.js-hydrated)')
      effectWidgets.forEach(el => {
        el.classList.add('js-hydrated')

        const e = el.getAttribute('e')
        const direction = el.getAttribute('direction')
        const magnitude = el.getAttribute('magnitude')
        const sentiment = el.getAttribute('sentiment')
        const label = el.getAttribute('label')
        const initialData = el.getAttribute('data-initial')

        el.innerHTML = ''
        const mountPoint = document.createElement('div')
        el.appendChild(mountPoint)

        const ComponentClass = Vue.extend(LongevidenceEffect)
        const instance = new ComponentClass({
          propsData: {
            e,
            direction,
            magnitude,
            sentiment,
            labelText: label,
            initialData
          },
          parent: this
        })
        instance.$mount(mountPoint)
      })

      const scoreWidgets = this.$refs.container.querySelectorAll('longevidence-score:not(.js-hydrated)')
      scoreWidgets.forEach(el => {
        el.classList.add('js-hydrated')

        const value = el.getAttribute('value')
        const label = el.getAttribute('label')
        const initialData = el.getAttribute('data-initial')

        el.innerHTML = ''
        const mountPoint = document.createElement('div')
        el.appendChild(mountPoint)

        const ComponentClass = Vue.extend(LongevidenceScore)
        const instance = new ComponentClass({
          propsData: {
            value,
            labelText: label,
            initialData
          },
          parent: this
        })
        instance.$mount(mountPoint)
      })
    }
  },
  
  // Ignore the custom element so Vue doesn't warn about it during compilation
  // Note: This needs to be configured in the main Vue config or ignoredElements
  // But inside a component we can't easily set ignoredElements for the ROOT.
  // However, since we are in page.vue which is the root of the theme, maybe we can?
  // Actually, ignoredElements is a global config.
  // Since we can't change global config easily here without modifying entry point...
  // We can try to register a dummy component for it?
}
</script>

