<template lang="pug">
  v-card.search-results-dropdown(flat, :class='{ "is-mobile": isMobile }')
    //- Filters Header
    .search-filters-container(v-if='hasVisibleCategoryFilters')
      .text-uppercase.caption.grey--text.font-weight-bold.mb-2.ml-1 Filter by
      .search-filters.d-flex.flex-wrap
        v-chip.filter-chip.mr-2.mb-2(
          v-for='filter in visibleFilters'
          :key='filter.value'
          :input-value='activeFilter === filter.value'
          @click='toggleFilter(filter.value)'
          :outlined='activeFilter !== filter.value'
          :color='activeFilter === filter.value ? "primary" : "grey darken-1"'
          :class='{"white--text": activeFilter === filter.value}'
          small
        ) {{ filter.label }}

    v-divider.mb-0(v-if='hasVisibleCategoryFilters')

    //- Results Area
    .search-results-list(v-if='results.length > 0')
      .results-header.caption.grey--text.mb-2.mt-4.ml-1(v-if="query") {{ results.length }} Result{{ results.length !== 1 ? 's' : '' }} found

      v-list(two-line, flat)
        template(v-for='(item, index) in results')
          v-hover(v-slot='{ hover }')
            v-card.mb-3.search-result-card(
              :key='item.id'
              @click='goToPage(item)'
              :class='{"elevation-2": hover, "elevation-0": !hover, "search-item-highlight": index === cursor}'
              outlined
            )
              v-card-text.pa-3
                .d-flex.align-center
                  //- Icon based on type
                  v-avatar.mr-3(
                    :color='getTypeColor(getItemType(item))'
                    size='40'
                    rounded
                  )
                    v-icon(color='white', small) {{ getTypeIcon(getItemType(item)) }}

                  .flex-grow-1
                    .d-flex.align-center.mb-1
                      v-chip.mr-2(
                        v-if='getItemType(item)'
                        x-small
                        label
                        color='grey lighten-4'
                        text-color='grey darken-2'
                        class="font-weight-bold text-uppercase"
                      ) {{ getItemType(item) }}
                      .subtitle-1.font-weight-bold.black--text.line-clamp-1(v-html='highlight(item.title)')

                    .caption.grey--text.text--darken-1.line-clamp-2(v-html='highlight(item.description)')
      v-pagination.my-4(
        v-if='paginationLength > 1'
        v-model='pagination'
        :length='paginationLength'
        circle
        small
        color='primary'
      )

    //- No Results / Empty State
    .search-status.text-center.py-12(v-else)
      div(v-if='isLoading')
        v-progress-circular(indeterminate, color='primary', size='40')
        .mt-4.subtitle-2.grey--text Searching Longevidence...

      div(v-else-if='query && query.length > 1')
        v-icon.mb-3(size='48', color='grey lighten-2') mdi-file-search-outline
        .subtitle-1.font-weight-medium No results found for "{{ query }}"
        .caption.grey--text Try adjusting your search or filter

      div(v-else)
        v-icon.mb-3(size='48', color='grey lighten-3') mdi-magnify
        .subtitle-1.grey--text.text--darken-1 Type to search
        .caption.grey--text Explore interventions, conditions, and more

    .request-page-prompt.text-center.py-4.px-4
      .grey--text {{ $t('common:search.cantFindPrompt') }}
      a.request-page-link.d-block.mt-1(@click.prevent='goToRequestPage') {{ $t('common:search.requestNewPage') }}

    v-divider

</template>

<script>
import _ from 'lodash'
import searchPagesQuery from 'gql/common/common-pages-query-search.gql'

export default {
  props: {
    query: {
      type: String,
      default: ''
    },
    isMobile: {
      type: Boolean,
      default: false
    }
  },
  data() {
    const allFilters = [
      { label: 'All', value: 'all' },
      { label: 'Interventions', value: 'intervention' },
      { label: 'Goal', value: 'goal' },
      { label: 'Outcomes', value: 'outcome' },
      { label: 'Conditions', value: 'condition' },
      { label: 'Categories', value: 'category' },
      { label: 'Study Summaries', value: 'study-summary' },
      { label: 'FAQs', value: 'faq' },
      { label: 'Articles', value: 'article' },
      { label: 'Glossary', value: 'glossary' }
    ]

    // Keep the filter taxonomy in place; enable only "all" for now.
    const enabledFilterValues = ['all']

    return {
      activeFilter: 'all',
      isLoading: false,
      cursor: -1,
      pagination: 1,
      perPage: 5,
      response: {
        results: [],
        suggestions: [],
        totalHits: 0
      },
      filters: allFilters,
      enabledFilterValues
    }
  },
  computed: {
    visibleFilters() {
      return this.filters.filter(filter => this.enabledFilterValues.includes(filter.value))
    },
    hasVisibleCategoryFilters() {
      return this.visibleFilters.some(filter => filter.value !== 'all')
    },
    results() {
      const currentIndex = (this.pagination - 1) * this.perPage
      let filteredResults = this.response.results || []

      if (this.activeFilter !== 'all' && this.enabledFilterValues.includes(this.activeFilter)) {
        filteredResults = filteredResults.filter(item =>
          item.tags && item.tags.includes(this.activeFilter)
        )
      }

      return _.slice(filteredResults, currentIndex, currentIndex + this.perPage)
    },
    paginationLength() {
      let count = this.response.results ? this.response.results.length : 0
      if (this.activeFilter !== 'all' && this.enabledFilterValues.includes(this.activeFilter)) {
        count = (this.response.results || []).filter(item =>
          item.tags && item.tags.includes(this.activeFilter)
        ).length
      }
      return Math.ceil(count / this.perPage)
    }
  },
  watch: {
    query(newVal) {
      if (!newVal || newVal.length < 2) {
        this.isLoading = false
      } else {
        this.isLoading = true
      }
      this.pagination = 1
      this.cursor = -1
    }
  },
  methods: {
    toggleFilter(filter) {
      if (!this.enabledFilterValues.includes(filter)) {
        return
      }
      this.activeFilter = filter
      this.pagination = 1
    },
    goToPage(item) {
      window.location.assign(`/${item.locale}/${item.path}`)
      this.$emit('close')
    },
    goToRequestPage() {
      const targetPath = (this.$helpers && this.$helpers.resolvePath)
        ? this.$helpers.resolvePath('requestpage')
        : '/requestpage'
      window.location.assign(targetPath)
      this.$emit('close')
    },
    highlight(text) {
      if (!this.query) return text
      const escapedQuery = _.escapeRegExp(this.query)
      const regex = new RegExp(`(${escapedQuery})`, 'gi')
      return text.replace(regex, '<mark>$1</mark>')
    },
    getItemType(item) {
      if (!item.tags) return null
      const enabledCategoryFilters = this.visibleFilters.filter(filter => filter.value !== 'all')
      if (enabledCategoryFilters.length === 0) return null
      const typeTag = item.tags.find(tag =>
        enabledCategoryFilters.some(f => f.value === tag)
      )
      return typeTag
    },
    getTypeColor(type) {
      const map = {
        'intervention': 'blue darken-1',
        'goal': 'green darken-1',
        'condition': 'red lighten-1',
        'outcome': 'purple lighten-1',
        'category': 'orange darken-1',
        'study-summary': 'teal darken-1',
        'article': 'blue-grey darken-1',
        'faq': 'amber darken-2'
      }
      return map[type] || 'grey'
    },
    getTypeIcon(type) {
      const map = {
        'intervention': 'mdi-pill',
        'goal': 'mdi-flag',
        'condition': 'mdi-hospital-box',
        'outcome': 'mdi-chart-line',
        'category': 'mdi-shape',
        'study-summary': 'mdi-file-document-outline',
        'article': 'mdi-newspaper',
        'faq': 'mdi-help-circle-outline'
      }
      return map[type] || 'mdi-file-outline'
    }
  },
  apollo: {
    response: {
      query: searchPagesQuery,
      variables() {
        return {
          query: this.query
        }
      },
      fetchPolicy: 'network-only',
      debounce: 300,
      skip() {
        return !this.query || this.query.length < 2
      },
      update: (data) => _.get(data, 'pages.search', {}),
      watchLoading(isLoading) {
        this.isLoading = isLoading
      }
    }
  }
}
</script>

<style lang="scss">
.search-results-dropdown {
  background-color: #fff;
  border-radius: 24px !important;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .search-filters-container {
    padding: 20px 20px 8px;
    background-color: #fcfcfc;
  }

  .filter-chip {
    font-weight: 500;
    border: 1px solid #e0e0e0;

    &.v-chip--active {
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      border-color: transparent;
    }
  }

  .search-results-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 16px;
  }

  .request-page-prompt {
    border-top: 1px solid #f0f0f0;
  }

  .request-page-link {
    color: var(--v-primary-base);
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }

  .request-page-link:hover {
    text-decoration: underline;
  }

  .search-result-card {
    border-radius: 8px;
    border-color: #f0f0f0 !important;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
      border-color: var(--v-primary-base) !important;
    }

    .line-clamp-1 {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  }

  mark {
    background-color: rgba(255, 235, 59, 0.5);
    color: #000;
    padding: 0 2px;
    border-radius: 2px;
  }
}

.search-results-dropdown.is-mobile {
  max-height: none;
  height: 100%;
  border-radius: 0 !important;
  display: flex;
  flex-direction: column;
}

.theme--dark .search-results-dropdown {
  background-color: #1b1b1b;

  .search-filters-container {
    background-color: #171717;
  }

  .filter-chip {
    border-color: rgba(255,255,255,0.15);
  }

  .search-result-card {
    background-color: #222;
    border-color: rgba(255,255,255,0.08) !important;
  }

  .request-page-prompt {
    border-top-color: rgba(255,255,255,0.08);
  }

  .black--text {
    color: #f5f5f5 !important;
  }

  .grey--text,
  .text--darken-1 {
    color: #b7b7b7 !important;
  }

  mark {
    background-color: rgba(255, 235, 59, 0.35);
    color: #111;
  }
}

/* Scrollbar styling */
.search-results-list::-webkit-scrollbar {
  width: 6px;
}
.search-results-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.search-results-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
.search-results-list::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}
</style>
