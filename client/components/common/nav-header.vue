<template lang='pug'>
  v-app-bar.nav-header(color='black', :dark='headerUsesDarkVariant', :light='!headerUsesDarkVariant', app, :clipped-left='!$vuetify.rtl', :clipped-right='$vuetify.rtl', fixed, flat, :extended='searchIsShown && $vuetify.breakpoint.smAndDown')
    v-toolbar(color='deep-purple', flat, slot='extension', v-if='searchIsShown && $vuetify.breakpoint.smAndDown')
      v-text-field(
        ref='searchFieldMobile'
        v-model='search'
        clearable
        background-color='deep-purple'
        color='white'
        :label='$t(`common:header.search`)'
        single-line
        solo
        flat
        hide-details
        prepend-inner-icon='mdi-magnify'
        :loading='searchIsLoading'
        @keyup.enter='searchEnter'
        autocomplete='none'
      )
    v-layout(row, class='no-gutters')
      v-flex(xs12, md4)
        v-toolbar.nav-header-inner(color='black', :dark='headerUsesDarkVariant', :light='!headerUsesDarkVariant', flat, :class='$vuetify.rtl ? `pr-3` : `pl-3`')
          v-menu(v-if='$vuetify.breakpoint.smAndDown', offset-y, transition='slide-y-transition', :left='!$vuetify.rtl', :right='$vuetify.rtl', max-height='80vh', :close-on-content-click='false')
            template(v-slot:activator='{ on, attrs }')
              v-btn.mr-1(icon, v-bind='attrs', v-on='on', aria-label='Open menu')
                v-icon(color='grey') mdi-menu
            v-list(nav, dense, :light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark', :class='$vuetify.theme.dark ? `grey darken-4` : ``')
              v-list-item(@click='goHome')
                v-list-item-icon: v-icon(color='grey') mdi-home
                v-list-item-title {{$t('common:header.home')}}

              v-list-item(v-if='!hideSearch', @click='searchToggle')
                v-list-item-icon: v-icon(color='grey') mdi-magnify
                v-list-item-title {{$t('common:header.search')}}

              v-list-item(@click='cycleAppearanceMode')
                v-list-item-icon: v-icon(color='grey') {{ appearanceIcon }}
                v-list-item-title {{ appearanceTooltip }}

              template(v-if='mode === `view` && locales.length > 0')
                v-divider
                v-list-item
                  v-list-item-icon: v-icon(color='grey') mdi-web
                  v-list-item-content
                    v-autocomplete(
                      :items='locales'
                      :value='locale'
                      item-text='name'
                      item-value='code'
                      :filter='filterLocales'
                      :placeholder='$t(`common:header.language`)'
                      flat
                      solo
                      hide-details
                      dense
                      @change='onLocaleChange'
                      :menu-props='{ offsetY: true, transition: "slide-y-transition", zIndex: 1000 }'
                    )
                      template(v-slot:item='{ item }')
                        v-list-item-content
                          v-list-item-title {{ item.name }}
                          v-list-item-subtitle.caption.grey--text(v-if='item.englishName && item.englishName !== item.name') {{ item.englishName }}

              template(v-if='hasAnyPagePermissions && path && mode !== `edit`')
                v-divider
                .overline.px-4.pt-3.pb-1.grey--text {{$t('common:header.pageActions')}}
                v-list-item(@click='pageView', v-if='mode !== `view`')
                  v-list-item-icon: v-icon(color='indigo') mdi-file-document-outline
                  v-list-item-title {{$t('common:header.view')}}
                v-list-item(@click='pageEdit', v-if='mode !== `edit` && hasWritePagesPermission')
                  v-list-item-icon: v-icon(color='indigo') mdi-file-document-edit-outline
                  v-list-item-title {{$t('common:header.edit')}}
                v-list-item(@click='pageHistory', v-if='mode !== `history` && hasReadHistoryPermission')
                  v-list-item-icon: v-icon(color='indigo') mdi-history
                  v-list-item-title {{$t('common:header.history')}}
                v-list-item(@click='pageSource', v-if='mode !== `source` && hasReadSourcePermission')
                  v-list-item-icon: v-icon(color='indigo') mdi-code-tags
                  v-list-item-title {{$t('common:header.viewSource')}}
                v-list-item(@click='pageRerender', v-if='hasWritePagesPermission', :disabled='rerenderLoading')
                  v-list-item-icon: v-icon(:color='rerenderLoading ? `grey` : `indigo`') mdi-cube-scan
                  v-list-item-title Re-Render
                v-list-item(@click='pageConvert', v-if='hasWritePagesPermission')
                  v-list-item-icon: v-icon(color='indigo') mdi-lightning-bolt
                  v-list-item-title {{$t('common:header.convert')}}
                v-list-item(@click='pageDuplicate', v-if='hasWritePagesPermission')
                  v-list-item-icon: v-icon(color='indigo') mdi-content-duplicate
                  v-list-item-title {{$t('common:header.duplicate')}}
                v-list-item(@click='pageMove', v-if='hasManagePagesPermission')
                  v-list-item-icon: v-icon(color='indigo') mdi-content-save-move-outline
                  v-list-item-title {{$t('common:header.move')}}
                v-list-item(@click='pageDelete', v-if='hasDeletePagesPermission')
                  v-list-item-icon: v-icon(color='red darken-2') mdi-trash-can-outline
                  v-list-item-title {{$t('common:header.delete')}}

              v-list-item(v-if='hasNewPagePermission && path && mode !== `edit`', @click='pageNew')
                v-list-item-icon: v-icon(color='grey') mdi-text-box-plus-outline
                v-list-item-title {{$t('common:header.newPage')}}

              template(v-if='isAuthenticated && isAdmin')
                v-divider
                v-list-item(v-if='mode !== `admin`', href='/a')
                  v-list-item-icon: v-icon(color='grey') mdi-cog
                  v-list-item-title {{$t('common:header.admin')}}
                v-list-item(v-else, href='/')
                  v-list-item-icon: v-icon(color='grey') mdi-exit-to-app
                  v-list-item-title {{$t('common:actions.exit')}}

          v-avatar.nav-header-logo-avatar(tile, size='34', @click='goHome')
            v-img.org-logo(:src='logoUrl')
          //- v-menu(open-on-hover, offset-y, bottom, left, min-width='250', transition='slide-y-transition')
          //-   template(v-slot:activator='{ on }')
          //-     v-app-bar-nav-icon.btn-animate-app(v-on='on', :class='$vuetify.rtl ? `mx-0` : ``')
          //-       v-icon mdi-menu
          //-   v-list(nav, :light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark', :class='$vuetify.theme.dark ? `grey darken-4` : ``')
          //-     v-list-item.pl-4(href='/')
          //-       v-list-item-avatar(size='24'): v-icon(color='blue') mdi-home
          //-       v-list-item-title.body-2 {{$t('common:header.home')}}
          //-     v-list-item.pl-4(@click='')
          //-       v-list-item-avatar(size='24'): v-icon(color='grey lighten-2') mdi-file-tree
          //-       v-list-item-content
          //-         v-list-item-title.body-2.grey--text.text--ligten-2 {{$t('common:header.siteMap')}}
          //-         v-list-item-subtitle.overline.grey--text.text--lighten-2 Coming soon
          //-     v-list-item.pl-4(href='/t')
          //-       v-list-item-avatar(size='24'): v-icon(color='teal') mdi-tag-multiple
          //-       v-list-item-title.body-2 {{$t('common:header.browseTags')}}
          //-     v-list-item.pl-4(@click='assets')
          //-       v-list-item-avatar(size='24'): v-icon(color='grey lighten-2') mdi-folder-multiple-image
          //-       v-list-item-content
          //-         v-list-item-title.body-2.grey--text.text--ligten-2 {{$t('common:header.imagesFiles')}}
          //-         v-list-item-subtitle.overline.grey--text.text--lighten-2 Coming soon
          v-toolbar-title.nav-header-title(:class='{ "mx-3": $vuetify.breakpoint.mdAndUp, "ml-2": $vuetify.breakpoint.smAndDown }')
            span.subheading {{title}}
          v-spacer(v-if='$vuetify.breakpoint.smAndDown')
          template(v-if='$vuetify.breakpoint.smAndDown')
            v-menu(v-if='isAuthenticated', offset-y, bottom, min-width='260', transition='slide-y-transition', :left='!$vuetify.rtl', :right='$vuetify.rtl')
              template(v-slot:activator='{ on: menu, attrs }')
                v-btn.nav-header-account-btn(
                  icon
                  v-bind='attrs'
                  v-on='menu'
                  :aria-label='$t(`common:header.account`)'
                )
                  v-icon(v-if='picture.kind === `initials`', color='grey') mdi-account-circle
                  v-avatar(v-else-if='picture.kind === `image`', :size='34')
                    v-img(:src='picture.url', @error='markAvatarImageFailed')
                      template(v-slot:placeholder)
                        v-layout(fill-height, align-center, justify-center, ma-0)
                          v-icon(color='grey') mdi-account-circle
              v-list(nav)
                v-list-item.py-3.grey(:class='$vuetify.theme.dark ? `darken-4-l5` : `lighten-5`')
                  v-list-item-avatar
                    v-avatar.orange(v-if='picture.kind === `initials`', :size='40')
                      span.white--text.subheading {{picture.initials}}
                    v-avatar(v-else-if='picture.kind === `image`', :size='40')
                      v-img(:src='picture.url', @error='markAvatarImageFailed')
                        template(v-slot:placeholder)
                          v-layout(fill-height, align-center, justify-center, ma-0, class='orange')
                            span.white--text.subheading {{picture.initials}}
                  v-list-item-content
                    v-list-item-title {{name}}
                    v-list-item-subtitle {{email}}
                v-list-item(href='/p')
                  v-list-item-action: v-icon(color='blue-grey') mdi-face-profile
                  v-list-item-content
                    v-list-item-title(:class='$vuetify.theme.dark ? `blue-grey--text text--lighten-3` : `blue-grey--text`') {{$t('common:header.profile')}}
                v-list-item(@click='logout')
                  v-list-item-action: v-icon(color='red') mdi-logout
                  v-list-item-title.red--text {{$t('common:header.logout')}}
            v-btn.header-login-btn.header-login-btn--mobile.ml-2(
              v-else
              depressed
              rounded
              href='/login'
              :aria-label='$t(`common:header.login`)'
            ) Sign up for free
      v-flex(md4, v-if='$vuetify.breakpoint.mdAndUp')
        v-toolbar.nav-header-inner(color='black', :dark='headerUsesDarkVariant', :light='!headerUsesDarkVariant', flat)
          slot(name='mid')
            transition(name='navHeaderSearch', v-if='searchIsShown')
              v-text-field(
                ref='searchField',
                v-if='searchIsShown && $vuetify.breakpoint.mdAndUp',
                v-model='search',
                color='white',
                :label='$t(`common:header.search`)',
                single-line,
                solo
                flat
                rounded
                hide-details,
                prepend-inner-icon='mdi-magnify',
                :loading='searchIsLoading',
                @keyup.enter='searchEnter'
                @keyup.esc='searchClose'
                @focus='searchFocus'
                @blur='searchBlur'
                @keyup.down='searchMove(`down`)'
                @keyup.up='searchMove(`up`)'
                autocomplete='none'
              )
            v-tooltip(bottom, v-if='showTags')
              template(v-slot:activator='{ on }')
                v-btn.ml-2.mr-0(icon, v-on='on', href='/t', :aria-label='$t(`common:header.browseTags`)')
                  v-icon(color='grey') mdi-tag-multiple
              span {{$t('common:header.browseTags')}}
      v-flex(md4, v-if='$vuetify.breakpoint.mdAndUp')
        v-toolbar.nav-header-inner.pr-4(color='black', :dark='headerUsesDarkVariant', :light='!headerUsesDarkVariant', flat)
          v-spacer
          .navHeaderLoading.mr-3
            v-progress-circular(indeterminate, color='blue', :size='22', :width='2' v-show='isLoading')

          slot(name='actions')

          //- APPEARANCE MODE (Day / Night)

          v-tooltip(bottom)
            template(v-slot:activator='{ on }')
              v-btn(
                icon
                tile
                height='64'
                v-on='on'
                @click='cycleAppearanceMode'
                :aria-label='appearanceAriaLabel'
                )
                v-icon(color='grey') {{ appearanceIcon }}
            span {{ appearanceTooltip }}
          v-divider(vertical)

          //- LANGUAGES

          template(v-if='mode === `view` && locales.length > 0')
            v-menu(offset-y, bottom, transition='slide-y-transition', min-width='300px', left, :close-on-content-click='false')
              template(v-slot:activator='{ on: menu, attrs }')
                v-tooltip(bottom)
                  template(v-slot:activator='{ on: tooltip }')
                    v-btn(
                      icon
                      v-bind='attrs'
                      v-on='{ ...menu, ...tooltip }'
                      :class='$vuetify.rtl ? `ml-3` : ``'
                      tile
                      height='64'
                      :aria-label='$t(`common:header.language`)'
                      )
                      v-icon(color='grey') mdi-web
                      v-icon(small, color='grey') mdi-chevron-down
                  span {{$t('common:header.language')}}
              v-card
                v-text-field(
                  v-model='localeSearch'
                  prepend-inner-icon='mdi-magnify'
                  :placeholder='$t(`common:header.search`)'
                  flat
                  solo
                  hide-details
                  dense
                  autofocus
                  clearable
                )
                v-divider
                v-list(max-height='320px' class='overflow-y-auto' nav)
                  v-list-item(v-for='item in filteredLocales' :key='item.code' @click='onLocaleChange(item.code)')
                    v-list-item-content
                      v-list-item-title {{ item.name }}
                      v-list-item-subtitle.caption.grey--text(v-if='item.englishName && item.englishName !== item.name') {{ item.englishName }}
            v-divider(vertical)

          //- PAGE ACTIONS

          template(v-if='hasAnyPagePermissions && path && mode !== `edit`')
            v-menu(offset-y, bottom, transition='slide-y-transition', left)
              template(v-slot:activator='{ on: menu, attrs }')
                v-tooltip(bottom)
                  template(v-slot:activator='{ on: tooltip }')
                    v-btn(
                      icon
                      v-bind='attrs'
                      v-on='{ ...menu, ...tooltip }'
                      :class='$vuetify.rtl ? `ml-3` : ``'
                      tile
                      height='64'
                      :aria-label='$t(`common:header.pageActions`)'
                      )
                      v-icon(color='grey') mdi-file-document-edit-outline
                  span {{$t('common:header.pageActions')}}
              v-list(nav, :light='!$vuetify.theme.dark', :dark='$vuetify.theme.dark', :class='$vuetify.theme.dark ? `grey darken-4` : ``')
                .overline.pa-4.grey--text {{$t('common:header.currentPage')}}
                v-list-item.pl-4(@click='pageView', v-if='mode !== `view`')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-file-document-outline
                  v-list-item-title.body-2 {{$t('common:header.view')}}
                v-list-item.pl-4(@click='pageEdit', v-if='mode !== `edit` && hasWritePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-file-document-edit-outline
                  v-list-item-title.body-2 {{$t('common:header.edit')}}
                v-list-item.pl-4(@click='pageHistory', v-if='mode !== `history` && hasReadHistoryPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-history
                  v-list-item-content
                    v-list-item-title.body-2 {{$t('common:header.history')}}
                v-list-item.pl-4(@click='pageSource', v-if='mode !== `source` && hasReadSourcePermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-code-tags
                  v-list-item-title.body-2 {{$t('common:header.viewSource')}}
                v-list-item.pl-4(@click='pageRerender', v-if='hasWritePagesPermission', :disabled='rerenderLoading')
                  v-list-item-avatar(size='24', tile): v-icon(:color='rerenderLoading ? `grey` : `indigo`') mdi-cube-scan
                  v-list-item-title.body-2 Re-Render
                v-list-item.pl-4(@click='pageConvert', v-if='hasWritePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-lightning-bolt
                  v-list-item-title.body-2 {{$t('common:header.convert')}}
                v-list-item.pl-4(@click='pageDuplicate', v-if='hasWritePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-content-duplicate
                  v-list-item-title.body-2 {{$t('common:header.duplicate')}}
                v-list-item.pl-4(@click='pageMove', v-if='hasManagePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='indigo') mdi-content-save-move-outline
                  v-list-item-content
                    v-list-item-title.body-2 {{$t('common:header.move')}}
                v-list-item.pl-4(@click='pageDelete', v-if='hasDeletePagesPermission')
                  v-list-item-avatar(size='24', tile): v-icon(color='red darken-2') mdi-trash-can-outline
                  v-list-item-title.body-2 {{$t('common:header.delete')}}
            v-divider(vertical)

          //- NEW PAGE

          template(v-if='hasNewPagePermission && path && mode !== `edit`')
            v-tooltip(bottom)
              template(v-slot:activator='{ on }')
                v-btn(icon, tile, height='64', v-on='on', @click='pageNew', :aria-label='$t(`common:header.newPage`)')
                  v-icon(color='grey') mdi-text-box-plus-outline
              span {{$t('common:header.newPage')}}
            v-divider(vertical)

          //- ADMIN

          template(v-if='isAuthenticated && isAdmin')
            v-tooltip(bottom, v-if='mode !== `admin`')
              template(v-slot:activator='{ on }')
                v-btn(icon, tile, height='64', v-on='on', href='/a', :aria-label='$t(`common:header.admin`)')
                  v-icon(color='grey') mdi-cog
              span {{$t('common:header.admin')}}
            v-btn(v-else, text, tile, height='64', href='/', :aria-label='$t(`common:actions.exit`)')
              v-icon(left, color='grey') mdi-exit-to-app
              span {{$t('common:actions.exit')}}
            v-divider(vertical)

          //- ACCOUNT

          v-menu(v-if='isAuthenticated', offset-y, bottom, min-width='300', transition='slide-y-transition', left)
            template(v-slot:activator='{ on: menu, attrs }')
              v-tooltip(bottom)
                template(v-slot:activator='{ on: tooltip }')
                  v-btn(
                    icon
                    v-bind='attrs'
                    v-on='{ ...menu, ...tooltip }'
                    :class='$vuetify.rtl ? `ml-0` : ``'
                    tile
                    height='64'
                    :aria-label='$t(`common:header.account`)'
                    )
                    v-icon(v-if='picture.kind === `initials`', color='grey') mdi-account-circle
                    v-avatar(v-else-if='picture.kind === `image`', :size='34')
                      v-img(:src='picture.url', @error='markAvatarImageFailed')
                        template(v-slot:placeholder)
                          v-layout(fill-height, align-center, justify-center, ma-0)
                            v-icon(color='grey') mdi-account-circle
                span {{$t('common:header.account')}}
            v-list(nav)
              v-list-item.py-3.grey(:class='$vuetify.theme.dark ? `darken-4-l5` : `lighten-5`')
                v-list-item-avatar
                  v-avatar.orange(v-if='picture.kind === `initials`', :size='40')
                    span.white--text.subheading {{picture.initials}}
                  v-avatar(v-else-if='picture.kind === `image`', :size='40')
                    v-img(:src='picture.url', @error='markAvatarImageFailed')
                      template(v-slot:placeholder)
                        v-layout(fill-height, align-center, justify-center, ma-0, class='orange')
                          span.white--text.subheading {{picture.initials}}
                v-list-item-content
                  v-list-item-title {{name}}
                  v-list-item-subtitle {{email}}
              //- v-list-item(href='/w', disabled)
              //-   v-list-item-action: v-icon(color='blue') mdi-view-compact-outline
              //-   v-list-item-content
              //-     v-list-item-title {{$t('common:header.myWiki')}}
              //-     v-list-item-subtitle.overline Coming soon
              v-list-item(href='/p')
                v-list-item-action: v-icon(color='blue-grey') mdi-face-profile
                v-list-item-content
                  v-list-item-title(:class='$vuetify.theme.dark ? `blue-grey--text text--lighten-3` : `blue-grey--text`') {{$t('common:header.profile')}}
              v-list-item(@click='logout')
                v-list-item-action: v-icon(color='red') mdi-logout
                v-list-item-title.red--text {{$t('common:header.logout')}}

          v-btn.header-login-btn(
            v-else
            depressed
            rounded
            href='/login'
            :aria-label='$t(`common:header.login`)'
          ) Sign up for free

    page-selector(mode='create', v-model='newPageModal', :open-handler='pageNewCreate', :locale='locale')
    page-selector(mode='move', v-model='movePageModal', :open-handler='pageMoveRename', :path='path', :locale='locale')
    page-selector(mode='create', v-model='duplicateOpts.modal', :open-handler='pageDuplicateHandle', :path='duplicateOpts.path', :locale='duplicateOpts.locale')
    page-delete(v-model='deletePageModal', v-if='path && path.length')
    page-convert(v-model='convertPageModal', v-if='path && path.length')

    //- dev banner removed per request
</template>

<script>
import { get, sync } from 'vuex-pathify'
import _ from 'lodash'

import movePageMutation from 'gql/common/common-pages-mutation-move.gql'
import gql from 'graphql-tag'
import { setAppearanceMode } from '../../helpers/theme-manager'

/* global siteConfig, siteLangs */

export default {
  name: 'NavHeader',
  components: {
    PageDelete: () => import('./page-delete.vue'),
    PageConvert: () => import('./page-convert.vue')
  },
  props: {
    dense: {
      type: Boolean,
      default: false
    },
    hideSearch: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      menuIsShown: true,
      searchIsShown: true,
      avatarImageFailed: false,
      searchAdvMenuShown: false,
      newPageModal: false,
      rerenderLoading: false,
      movePageModal: false,
      convertPageModal: false,
      deletePageModal: false,
      locales: siteLangs,
      localeSearch: '',
      isDevMode: false,
      duplicateOpts: {
        locale: 'en',
        path: 'new-page',
        modal: false
      }
    }
  },
  computed: {
    search: sync('site/search'),
    searchIsFocused: sync('site/searchIsFocused'),
    searchIsLoading: sync('site/searchIsLoading'),
    searchRestrictLocale: sync('site/searchRestrictLocale'),
    searchRestrictPath: sync('site/searchRestrictPath'),
    isLoading: get('isLoading'),
    title: get('site/title'),
    logoUrl: get('site/logoUrl'),
    showTags: get('site/showTags'),
    path: get('page/path'),
    locale: get('page/locale'),
    mode: get('page/mode'),
    appearanceMode: get('site/appearanceMode'),
    darkMode: get('site/dark'),
    name: get('user/name'),
    email: get('user/email'),
    pictureUrl: get('user/pictureUrl'),
    isAuthenticated: get('user/authenticated'),
    permissions: get('user/permissions'),
    picture () {
      const nameParts = this.name.toUpperCase().split(' ')
      let initials = _.head(nameParts).charAt(0)
      if (nameParts.length > 1) {
        initials += _.last(nameParts).charAt(0)
      }

      if (this.avatarImageFailed) {
        return {
          kind: 'initials',
          initials
        }
      }

      if (this.pictureUrl && this.pictureUrl.length > 1) {
        if (this.pictureUrl !== 'internal' && !this.pictureUrl.startsWith('http://') && !this.pictureUrl.startsWith('https://') && !this.pictureUrl.startsWith('/')) {
          return {
            kind: 'initials',
            initials
          }
        }

        return {
          kind: 'image',
          url: (this.pictureUrl === 'internal') ? `/_userav/${this.$store.get('user/id')}` : this.pictureUrl
        }
      }

      return {
        kind: 'initials',
        initials
      }
    },
    isAdmin () {
      return _.intersection(this.permissions, ['manage:system', 'write:users', 'manage:users', 'write:groups', 'manage:groups', 'manage:navigation', 'manage:theme', 'manage:api']).length > 0
    },
    hasNewPagePermission () {
      return this.hasAdminPermission || _.intersection(this.permissions, ['write:pages']).length > 0
    },
    hasAdminPermission: get('page/effectivePermissions@system.manage'),
    hasWritePagesPermission: get('page/effectivePermissions@pages.write'),
    hasManagePagesPermission: get('page/effectivePermissions@pages.manage'),
    hasDeletePagesPermission: get('page/effectivePermissions@pages.delete'),
    hasReadSourcePermission: get('page/effectivePermissions@source.read'),
    hasReadHistoryPermission: get('page/effectivePermissions@history.read'),
    hasAnyPagePermissions () {
      return this.hasAdminPermission || this.hasWritePagesPermission || this.hasManagePagesPermission ||
        this.hasDeletePagesPermission || this.hasReadSourcePermission || this.hasReadHistoryPermission
    },
    appearanceModeNormalized () {
      if (['light', 'dark'].includes(this.appearanceMode)) {
        return this.appearanceMode
      }
      return this.darkMode ? 'dark' : 'light'
    },
    isLongevidenceTheme () {
      return typeof siteConfig !== 'undefined' && siteConfig.theme === 'longevidence'
    },
    headerUsesDarkVariant () {
      return !(this.isLongevidenceTheme && this.appearanceModeNormalized === 'light')
    },
    appearanceIcon () {
      switch (this.appearanceModeNormalized) {
        case 'light':
          return 'mdi-white-balance-sunny'
        case 'dark':
        default:
          return 'mdi-weather-night'
      }
    },
    appearanceTooltip () {
      switch (this.appearanceModeNormalized) {
        case 'light':
          return 'Appearance: Day'
        case 'dark':
        default:
          return 'Appearance: Night'
      }
    },
    appearanceAriaLabel () {
      switch (this.appearanceModeNormalized) {
        case 'light':
          return 'Appearance mode: Day'
        case 'dark':
        default:
          return 'Appearance mode: Night'
      }
    },
    filteredLocales () {
      if (!this.localeSearch) return this.locales
      const queryText = this.localeSearch.toLowerCase()
      return this.locales.filter(item => {
        const textOne = item.name.toLowerCase()
        const textTwo = item.englishName ? item.englishName.toLowerCase() : ''
        return textOne.indexOf(queryText) > -1 || textTwo.indexOf(queryText) > -1
      })
    }
  },
  created () {
    if (this.hideSearch || this.dense || this.$vuetify.breakpoint.smAndDown) {
      this.searchIsShown = false
    }
  },
  watch: {
    pictureUrl () {
      this.avatarImageFailed = false
    }
  },
  mounted () {
    this.$root.$on('pageEdit', () => {
      this.pageEdit()
    })
    this.$root.$on('pageHistory', () => {
      this.pageHistory()
    })
    this.$root.$on('pageSource', () => {
      this.pageSource()
    })
    this.$root.$on('pageMove', () => {
      this.pageMove()
    })
    this.$root.$on('pageConvert', () => {
      this.pageConvert()
    })
    this.$root.$on('pageDuplicate', () => {
      this.pageDuplicate()
    })
    this.$root.$on('pageDelete', () => {
      this.pageDelete()
    })
    this.isDevMode = siteConfig.devMode === true
  },
  methods: {
    markAvatarImageFailed () {
      this.avatarImageFailed = true
    },
    searchFocus () {
      this.searchIsFocused = true
    },
    searchBlur () {
      this.searchIsFocused = false
    },
    searchClose () {
      this.search = ''
      this.searchBlur()
    },
    searchToggle () {
      this.searchIsShown = !this.searchIsShown
      if (this.searchIsShown) {
        _.delay(() => {
          this.$refs.searchFieldMobile.focus()
        }, 200)
      }
    },
    searchEnter () {
      this.$root.$emit('search-enter', true)
    },
    searchMove(dir) {
      this.$root.$emit('search-move', dir)
    },
    pageNew () {
      this.newPageModal = true
    },
    pageNewCreate ({ path, locale }) {
      window.location.assign(`/e/${locale}/${path}`)
    },
    pageView () {
      window.location.assign(`/${this.locale}/${this.path}`)
    },
    pageEdit () {
      window.location.assign(`/e/${this.locale}/${this.path}`)
    },
    pageHistory () {
      window.location.assign(`/h/${this.locale}/${this.path}`)
    },
    pageSource () {
      window.location.assign(`/s/${this.locale}/${this.path}`)
    },
    async pageRerender () {
      if (this.rerenderLoading) return
      const pageId = this.$store.get('page/id')
      if (!pageId) return
      this.rerenderLoading = true
      this.$store.commit(`loadingStart`, 'page-rerender')
      try {
        const resp = await this.$apollo.mutate({
          mutation: gql`
            mutation($id: Int!) {
              pages {
                render(id: $id) {
                  responseResult {
                    succeeded
                    errorCode
                    message
                  }
                }
              }
            }
          `,
          variables: {
            id: pageId
          }
        })
        const result = _.get(resp, 'data.pages.render.responseResult', {})
        if (result.succeeded) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: 'Page re-rendered successfully.',
            icon: 'check'
          })
        } else {
          throw new Error(result.message || this.$t('common:error.unexpected'))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
      this.$store.commit(`loadingStop`, 'page-rerender')
      this.rerenderLoading = false
    },
    pageDuplicate () {
      const pathParts = this.path.split('/')
      this.duplicateOpts = {
        locale: this.locale,
        path: (pathParts.length > 1) ? _.initial(pathParts).join('/') + `/new-page` : `new-page`,
        modal: true
      }
    },
    pageDuplicateHandle ({ locale, path }) {
      window.location.assign(`/e/${locale}/${path}?from=${this.$store.get('page/id')}`)
    },
    pageConvert () {
      this.convertPageModal = true
    },
    pageMove () {
      this.movePageModal = true
    },
    async pageMoveRename ({ path, locale }) {
      this.$store.commit(`loadingStart`, 'page-move')
      try {
        const resp = await this.$apollo.mutate({
          mutation: movePageMutation,
          variables: {
            id: this.$store.get('page/id'),
            destinationLocale: locale,
            destinationPath: path
          }
        })
        if (_.get(resp, 'data.pages.move.responseResult.succeeded', false)) {
          window.location.replace(`/${locale}/${path}`)
        } else {
          throw new Error(_.get(resp, 'data.pages.move.responseResult.message', this.$t('common:error.unexpected')))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
        this.$store.commit(`loadingStop`, 'page-move')
      }
    },
    pageDelete () {
      this.deletePageModal = true
    },
    assets () {
      // window.location.assign(`/f`)
      this.$store.commit('showNotification', {
        style: 'indigo',
        message: `Coming soon...`,
        icon: 'ferry'
      })
    },
    async changeLocale (locale) {
      await this.$i18n.i18next.changeLanguage(locale.code)
      switch (this.mode) {
        case 'view':
        case 'history':
          window.location.assign(`/${locale.code}/${this.path}`)
          break
      }
    },
    logout () {
      window.location.assign('/logout')
    },
    goHome () {
      window.location.assign('/')
    },
    cycleAppearanceMode () {
      const cur = this.appearanceModeNormalized
      const next = (cur === 'light') ? 'dark' : 'light'
      setAppearanceMode(next, this.$store)
    },
    filterLocales (item, queryText, itemText) {
      const textOne = item.name.toLowerCase()
      const textTwo = item.englishName ? item.englishName.toLowerCase() : ''
      const searchText = queryText.toLowerCase()

      return textOne.indexOf(searchText) > -1 ||
        textTwo.indexOf(searchText) > -1
    },
    onLocaleChange (code) {
      const locale = this.locales.find(l => l.code === code)
      if (locale) {
        this.changeLocale(locale)
      }
    }
  }
}
</script>

<style lang='scss'>

.nav-header {
  //z-index: 1000;

  .v-toolbar__extension {
    padding: 0;

    .v-toolbar__content {
      padding: 0;
    }
    .v-text-field .v-input__prepend-inner {
      padding: 0 14px 0 5px;
      padding-right: 14px;
    }
  }

  .org-logo {
    cursor: pointer;
  }

  &-inner {
    .v-toolbar__content {
      padding: 0;
    }
  }

  &-search-adv {
    position: absolute;
    top: 7px;
    right: 12px;
    border-radius: 4px !important;

    @at-root .v-application--is-rtl & {
      right: initial;
      left: 12px;
    }

    &::before {
      border-radius: 4px !important;
    }

    &:hover, &:focus {
      position: absolute !important;

      &::before {
        border-radius: 4px;
      }
    }
  }

  &-dev {
    background-color: mc('red', '600');
    position: absolute;
    top: 11px;
    left: 255px;
    padding: 5px 15px;
    border-radius: 5px;
    display: flex;

    .v-icon {
      margin-right: 15px;
    }

    .overline:nth-child(2) {
      text-transform: none;
    }
  }

  .mobile-language-group {
    .v-list-group__items .v-list-item {
      // Vuetify defaults to a deep nested offset for grouped items; halve it on mobile language submenu.
      padding-left: 36px !important;
    }
  }

  @at-root .v-application--is-rtl & .mobile-language-group .v-list-group__items .v-list-item {
    padding-left: 0 !important;
    padding-right: 36px !important;
  }
}

.navHeaderSearch {
  &-enter-active, &-leave-active {
    transition: opacity .25s ease, transform .25s ease;
    opacity: 1;
  }
  &-enter-active {
    transition-delay: .25s;
  }
  &-enter, &-leave-to {
    opacity: 0;
    transform: scale(.7, .7);
  }
}
.navHeaderLoading { // To avoid search bar jumping
  width: 22px;
}

.header-login-btn {
  border-radius: 999px !important;
  min-width: 88px !important;
  padding: 0 16px !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em !important;
  background-color: #f36614 !important;
  color: #ffffff !important;
  box-shadow: none !important;

  .v-btn__content {
    color: #ffffff !important;
  }

  &:hover {
    background-color: #ff7a2e !important;
  }
}

.header-login-btn--mobile {
  min-width: 74px !important;
  height: 34px !important;
  padding: 0 12px !important;
  font-size: 0.85rem !important;
  margin-right: 16px !important;
}

</style>
