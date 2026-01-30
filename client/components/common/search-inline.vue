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
        :nudge-bottom="8"
        :min-width='menuWidth'
        :max-width='menuWidth'
        content-class='search-results-menu'
        transition='slide-y-transition'
      )
        template(v-slot:activator='{ on, attrs }')
          v-text-field.longevidence-search-input(
            v-bind='attrs'
            v-on='on'
            ref='searchInput'
            v-model='localQuery'
            placeholder='Search Longevidence...'
            solo
            flat
            rounded
            hide-details
            prepend-inner-icon='mdi-magnify'
            background-color='white'
            light
            height='48'
            @keyup.enter='searchEnter'
            @keyup.esc='searchClose'
            @keyup.down='searchMove(`down`)'
            @keyup.up='searchMove(`up`)'
            @input='searchInput'
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
      localQuery: '',
      menuWidth: null,
      resizeHandler: null
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
    searchInput (value) {
      if (this.useThemeOverlay && value) {
        this.menuShown = true
      }
    },
    updateMenuWidth () {
      this.$nextTick(() => {
        const inputEl = this.$refs.searchInput && this.$refs.searchInput.$el
        if (inputEl) {
          this.menuWidth = Math.round(inputEl.getBoundingClientRect().width)
        }
      })
    },
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
  },
  watch: {
    menuShown (value) {
      if (value) {
        this.updateMenuWidth()
      }
    }
  },
  mounted () {
    this.updateMenuWidth()
    this.resizeHandler = () => this.updateMenuWidth()
    window.addEventListener('resize', this.resizeHandler)
  },
  beforeDestroy () {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
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
    background-color: #ffffff !important;
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
    transition: all 0.3s ease;
  }

  .v-input--is-focused .v-input__slot {
    box-shadow: 0 8px 20px rgba(0,0,0,0.1) !important;
    border-color: rgba(0,0,0,0.0);
  }

  .v-label,
  input,
  .v-icon {
    color: #333333 !important;
  }
  
  .v-icon {
    opacity: 0.6;
  }
}

.theme--dark .search-inline.is-theme-overlay {
  .v-input__slot {
    background-color: #1c1c1c !important;
    border: 1.5px solid rgba(255,255,255,0.1);
    box-shadow: 0 8px 20px rgba(0,0,0,0.45) !important;
  }

  .v-input--is-focused .v-input__slot {
    box-shadow: 0 12px 26px rgba(0,0,0,0.6) !important;
    border-color: rgba(255,255,255,0.12);
  }

  .v-label,
  input,
  .v-icon {
    color: #e6e6e6 !important;
  }

  .v-icon {
    opacity: 0.7;
  }

  .longevidence-search-input input,
  .v-text-field input {
    color: #e6e6e6 !important;
  }

  .longevidence-search-input input::placeholder,
  .v-text-field input::placeholder {
    color: rgba(230,230,230,0.7) !important;
  }
}

.v-menu__content.search-results-menu {
  border-radius: 24px !important;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important;
  margin-top: 8px;
}

.theme--dark .v-menu__content.search-results-menu {
  box-shadow: 0 16px 40px rgba(0,0,0,0.55) !important;
}
</style>
