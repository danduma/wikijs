<template lang='pug'>
  .search-inline(:class='{ "is-theme-overlay": useThemeOverlay }')
    template(v-if='useThemeOverlay')
      v-menu(
        v-model='menuShown'
        offset-y
        :close-on-content-click='false'
        :close-on-click='false'
        :open-on-click='false'
        open-on-focus
        max-width='800'
        min-width='600'
        content-class='search-results-menu'
      )
        template(v-slot:activator='{ on, attrs }')
          v-text-field(
            v-bind='attrs'
            v-on='on'
            v-model='localQuery'
            placeholder='Search...'
            solo
            flat
            dense
            rounded
            hide-details
            prepend-inner-icon='mdi-magnify'
            background-color='grey darken-3'
            dark
            @keyup.enter='searchEnter'
            @keyup.esc='searchClose'
            @keyup.down='searchMove(`down`)'
            @keyup.up='searchMove(`up`)'
            autocomplete='none'
          )
        search-overlay(
          :query='localQuery'
          @close='menuShown = false'
        )
    template(v-else)
      v-text-field(
        v-model='search'
        :label='$t(`common:header.search`)'
        color='white'
        single-line
        solo
        flat
        rounded
        prepend-inner-icon='mdi-magnify'
        :loading='searchIsLoading'
        @keyup.enter='searchEnter'
        @keyup.esc='searchClose'
        @focus='searchFocus'
        @blur='searchBlur'
        @keyup.down='searchMove(`down`)'
        @keyup.up='searchMove(`up`)'
        autocomplete='none'
        hide-details
      )
</template>

<script>
/* global siteConfig */
import { sync } from 'vuex-pathify'

export default {
  components: {
    SearchOverlay: () => import('../../themes/longevidence/components/search-overlay.vue')
  },
  data() {
    return {
      menuShown: false,
      localQuery: ''
    }
  },
  computed: {
    search: sync('site/search'),
    searchIsFocused: sync('site/searchIsFocused'),
    searchIsLoading: sync('site/searchIsLoading'),
    useThemeOverlay() {
      return (typeof siteConfig !== 'undefined' && siteConfig.theme === 'longevidence')
    }
  },
  methods: {
    searchFocus () {
      this.searchIsFocused = true
    },
    searchBlur () {
      this.searchIsFocused = false
    },
    searchClose () {
      if (this.useThemeOverlay) {
        this.localQuery = ''
        this.menuShown = false
      } else {
        this.search = ''
        this.searchBlur()
      }
    },
    searchEnter () {
      this.$root.$emit('search-enter', true)
    },
    searchMove(dir) {
      this.$root.$emit('search-move', dir)
    }
  }
}
</script>

<style lang='scss'>
.search-inline {
  display: flex;
  justify-content: center;
  width: 100%;
  margin: 20px auto;

  .v-text-field {
    max-width: 600px;
    width: 100%;
  }
}

.search-inline.is-theme-overlay {
  .v-input__slot {
    background-color: #424242 !important;
  }

  .v-label,
  input,
  .v-icon {
    color: #ffffff !important;
  }
}
</style>
