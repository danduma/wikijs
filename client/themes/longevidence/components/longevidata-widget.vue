<template>
  <div class="longevidata-widget">
    <!-- Before hydration: show static slot content -->
    <template v-if="!hydrated">
      <slot />
    </template>
    <template v-else>
      <div class="longevidata-header">
        <h4>LongeviData: {{ config.name }}</h4>
      </div>

      <div class="longevidata-toolbar-merged">
        <div class="longevidata-search-wrapper">
          <input
            v-model="searchQuery"
            @input="debouncedSearch"
            type="text"
            class="longevidata-search-input"
            placeholder="Begin typing to filter database"
          >
          <button class="longevidata-search-btn">
            <span class="mdi mdi-magnify" />
          </button>
        </div>

        <div class="longevidata-controls-right">
          <div class="longevidata-toggle-wrapper">
            <label class="switch">
              <input type="checkbox" v-model="showConditions">
              <span class="slider round"></span>
            </label>
            <span class="toggle-label">{{ config.type === 'intervention' ? 'Show Conditions' : 'Show Interventions' }}</span>
          </div>
          
          <div class="longevidata-actions">
            <button
              class="text-btn"
              @click="expandAll"
            >
              Expand
            </button>
            <button
              class="text-btn"
              @click="collapseAll"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <div
          v-if="refreshing"
          class="longevidata-loading"
        >
          <v-progress-circular indeterminate color="primary" />
          <span class="ml-3">Refreshing data...</span>
        </div>
        <table class="longevidata-table">
          <thead>
            <tr>
              <th
                v-for="col in columns"
                :key="col.key"
                @click="sortBy(col.key)"
                :class="['col-' + col.key, { sortable: true }]"
              >
                {{ col.label }}
                <span
                  v-if="sortField === col.key"
                  class="mdi"
                  :class="sortAsc ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                />
              </th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr>
              <td
                :colspan="columns.length"
                class="text-center pa-4"
              >
                Loading...
              </td>
            </tr>
          </tbody>
          <tbody v-else-if="groupedOutcomes.length === 0">
            <tr>
              <td
                :colspan="columns.length"
                class="text-center pa-4"
              >
                No outcomes found.
              </td>
            </tr>
          </tbody>
          <tbody
            v-else
            v-for="group in groupedOutcomes"
            :key="'group-' + group.id"
          >
            <tr
              v-if="showConditions"
              class="longevidata-group-row"
              @click="toggleGroup(group.id)"
            >
              <td>
                {{ group.name }}
                <span
                  class="mdi"
                  :class="expanded[group.id] ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                />
              </td>
              <td>{{ group.outcomes.length }} outcomes</td>
              <td />
              <td class="col-evidence">{{ group.totalStudies }} Studies</td>
              <td />
            </tr>
            <template v-if="expanded[group.id] || !showConditions">
              <template v-for="(outcome, idx) in group.outcomes">
                <!-- CTA before first locked item -->
                <tr v-if="outcome.isLocked && isFirstLocked(group.outcomes, idx)" class="longevidata-locked-cta-row">
                  <td :colspan="showConditions ? 5 : 4">
                    <div class="locked-cta-content">
                      <div class="locked-text">
                        <span v-html="lockedMessageHtml"></span>
                      </div>
                    </div>
                  </td>
                </tr>

                <tr
                  :key="'outcome-' + group.id + '-' + idx"
                  class="longevidata-outcome-row"
                  :class="{ 'is-locked': outcome.isLocked }"
                >
                  <td v-if="showConditions" />
                  <td class="col-outcome">{{ outcome.vocabulary_term || outcome.outcome_name }}</td>
                  
                  <!-- Grade Column -->
                  <td class="col-grade">
                    <div v-if="outcome.isLocked" class="locked-badge">
                      <span class="mdi mdi-lock" />
                    </div>
                    <span v-else :class="gradeClass(outcome.grade_rating)">{{ gradeLabel(outcome.grade_rating) }}</span>
                  </td>

                  <!-- Evidence Column -->
                  <td class="col-evidence">
                    <template v-if="outcome.isLocked">
                      <span class="locked-text-sm">
                        <span class="mdi mdi-file-document-outline" /> Locked
                      </span>
                    </template>
                    <template v-else>
                      {{ outcome.study_count }} Studies
                      <span v-if="outcome.total_participants">· {{ outcome.total_participants }} Participants</span>
                    </template>
                  </td>

                  <!-- Effect Column -->
                  <td class="col-effect">
                    <div v-if="outcome.isLocked" class="locked-badge">
                      <span class="mdi mdi-lock" />
                    </div>
                    <span v-else :class="effectClass(outcome.effect_direction)">{{ effectLabel(outcome) }}</span>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
      <div
        v-if="showPaywallCta"
        class="longevidata-tier-separator"
        @click="openPaywall"
      >
        Unlock more outcomes with a membership tier
      </div>
      <membership-paywall v-model="paywallShown" />
    </template>
  </div>
</template>

<script>
import { Base64 } from 'js-base64'
import _ from 'lodash'
import MembershipPaywall from '../../../components/common/membership-paywall.vue'

export default {
  name: 'LongeviDataTable',
  components: {
    MembershipPaywall
  },
  props: {
    intervention: { type: String, default: null },
    condition: { type: String, default: null },
    biomarker: { type: String, default: null },
    name: { type: String, default: 'Research Data' },
    initialData: { type: String, default: null }
  },
  inject: {
    membershipInfo: { default: null }
  },
  data() {
    return {
      hydrated: false,

      loading: false,
      refreshing: false,
      config: {
        type: 'intervention',
        entityId: null,
        name: ''
      },
      outcomes: [],
      totalOutcomes: 0,
      searchQuery: '',
      sortField: 'totalStudies',
      sortAsc: false,
      expanded: {},
      showConditions: false,
      maxRows: null,
      tierKey: 'free',
      lockedMessageKey: null,
      paywallShown: false
    }
  },
  computed: {
    lockedMessageHtml() {
      if (this.lockedMessageKey) {
        return this.$t(this.lockedMessageKey)
      }
      return 'Get the full database with a <a href="/pricing" target="_blank">paid subscription</a>.'
    },
    columns() {
      if (this.config.type === 'intervention') {
        const cols = [
          { key: 'group', label: 'Health Condition/Goal' },
          { key: 'outcome', label: 'Health Outcome' },
          { key: 'grade', label: 'Grade' },
          { key: 'evidence', label: 'Evidence' },
          { key: 'effect', label: 'Effect' }
        ]
        if (!this.showConditions) cols.shift()
        return cols
      } else if (this.config.type === 'condition') {
        const cols = [
          { key: 'group', label: 'Intervention' },
          { key: 'outcome', label: 'Health Outcome' },
          { key: 'grade', label: 'Grade' },
          { key: 'evidence', label: 'Evidence' },
          { key: 'effect', label: 'Effect' }
        ]
        if (!this.showConditions) cols.shift()
        return cols
      } else {
        const cols = [
          { key: 'group', label: 'Intervention' },
          { key: 'outcome', label: 'Health Condition/Goal' },
          { key: 'grade', label: 'Grade' },
          { key: 'evidence', label: 'Evidence' },
          { key: 'effect', label: 'Effect' }
        ]
        if (!this.showConditions) cols.shift()
        return cols
      }
    },
    groupedOutcomes() {
      if (!this.outcomes) return []

      // Filter first
      let filtered = this.outcomes
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase()
        filtered = filtered.filter(o => {
          return (o.vocabulary_term && o.vocabulary_term.toLowerCase().includes(q)) ||
                 (o.condition_name && o.condition_name.toLowerCase().includes(q)) ||
                 (o.intervention_name && o.intervention_name.toLowerCase().includes(q))
        })
      }

      // Group
      const groups = {}
      filtered.forEach(outcome => {
        let groupKey = ''
        let groupName = ''

        if (this.config.type === 'intervention') {
          groupKey = outcome.condition_id || outcome.condition_name
          groupName = outcome.condition_name || 'Unknown Condition'
        } else {
          groupKey = outcome.intervention_id || outcome.intervention_name
          groupName = outcome.intervention_name || 'Unknown Intervention'
        }

        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: groupKey,
            name: groupName,
            outcomes: [],
            totalStudies: 0
          }
        }

        groups[groupKey].outcomes.push(outcome)
        groups[groupKey].totalStudies += (outcome.study_count || 0)
      })

      let result = Object.values(groups)

      // Sort Groups
      result.sort((a, b) => {
        let valA = a[this.sortField]
        let valB = b[this.sortField]

        // Special handling for string vs number if needed,
        // but currently sortField is mostly totalStudies for groups
        if (this.sortField === 'group') {
          valA = a.name
          valB = b.name
        }

        if (valA < valB) return this.sortAsc ? -1 : 1
        if (valA > valB) return this.sortAsc ? 1 : -1
        return 0
      })

      return result
    },
    showPaywallCta() {
      if (this.maxRows === null || this.maxRows === undefined) return false
      return this.totalOutcomes > this.outcomes.length
    }
  },
  mounted() {
    // Read config from props (preferred) or attributes (fallback)
    const $el = this.$el
    
    // Check if we have props (hydrated via JS) or need to read DOM attributes (if mounted on existing element without props)
    // Note: When using new Vue({ propsData: ... }), props will be populated.
    
    const interventionId = this.intervention || $el.getAttribute('intervention')
    const conditionId = this.condition || $el.getAttribute('condition')
    const biomarkerId = this.biomarker || $el.getAttribute('biomarker')
    this.config.name = this.name || $el.getAttribute('name') || 'Research Data'

    if (conditionId) {
      this.config.type = 'condition'
      this.config.entityId = conditionId
    } else if (biomarkerId) {
      this.config.type = 'biomarker'
      this.config.entityId = biomarkerId
    } else {
      this.config.type = 'intervention'
      this.config.entityId = interventionId
    }

    // Load initial data
    const initialDataStr = this.initialData || $el.getAttribute('data-initial')
    if (initialDataStr) {
      try {
        const jsonStr = Base64.decode(initialDataStr)
        const data = JSON.parse(jsonStr)
        this.outcomes = data.outcomes || []
        this.totalOutcomes = data.totalOutcomes || this.outcomes.length

        // Expand all by default initially? Or just top ones?
        // Let's expand all for now to match static view if needed
        this.expandAll()
      } catch (e) {
        console.error('Failed to parse initial data', e)
      }
    }

    if (this.membershipInfo) {
      this.maxRows = this.membershipInfo.maxRows
      this.tierKey = this.membershipInfo.tierKey || this.tierKey
    }

    this.hydrated = true
    this.refreshOutcomes()
  },
  methods: {
    debouncedSearch: _.debounce(function() {
      // In this implementation, we have full dataset in client (from data-initial),
      // so search is local. If API search is needed (server-side filtering),
      // we would call fetchOutcomes here.
      // Plan says: "User interacts (search/sort/filter) -> API calls -> table re-renders"
      // But also says "Component reads data-initial ... (can be full dataset)".
      // If we have full dataset, local search is faster.
      // Assuming full dataset for now based on "can be full dataset".
      // If we need to fetch fresh data:
      // this.fetchOutcomes()
    }, 300),

    async fetchOutcomes() {
      this.loading = true
      try {
        let params = new URLSearchParams()
        if (this.config.type === 'intervention') params.append('intervention_id', this.config.entityId)
        if (this.config.type === 'condition') params.append('condition_id', this.config.entityId)
        if (this.config.type === 'biomarker') params.append('vocabulary_id', this.config.entityId)

        if (this.searchQuery) params.append('q', this.searchQuery)

        // Proxy endpoint
        const res = await fetch(`/api/longevidata/outcomes?${params.toString()}`)
        const data = await res.json()
        this.outcomes = data.outcomes || []
      } catch (err) {
        console.error('API Error', err)
      } finally {
        this.loading = false
      }
    },
    async refreshOutcomes() {
      this.refreshing = true
      try {
        let params = new URLSearchParams()
        if (this.config.type === 'intervention') params.append('intervention_id', this.config.entityId)
        if (this.config.type === 'condition') params.append('condition_id', this.config.entityId)
        if (this.config.type === 'biomarker') params.append('vocabulary_id', this.config.entityId)

        const res = await fetch(`/api/longevidata/outcomes?${params.toString()}`)
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }
        const data = await res.json()
        this.outcomes = data.outcomes || []
        this.totalOutcomes = data.totalOutcomes || this.outcomes.length
        if (data.maxRows !== undefined) this.maxRows = data.maxRows
        if (data.tierKey) this.tierKey = data.tierKey
        if (data.lockedMessageKey) this.lockedMessageKey = data.lockedMessageKey
        this.expandAll()
      } catch (err) {
        console.error('Failed to refresh longevidata outcomes', err)
      } finally {
        this.refreshing = false
      }
    },
    openPaywall() {
      this.paywallShown = true
    },

    sortBy(key) {
      if (this.sortField === key) {
        this.sortAsc = !this.sortAsc
      } else {
        this.sortField = key
        this.sortAsc = false // Default Descending for studies/evidence
      }
    },

    toggleGroup(id) {
      this.$set(this.expanded, id, !this.expanded[id])
    },

    expandAll() {
      const allIds = {}
      this.groupedOutcomes.forEach(g => { allIds[g.id] = true })
      this.expanded = allIds
    },

    collapseAll() {
      this.expanded = {}
    },

    gradeClass(grade) {
      const g = (grade || '').trim().toUpperCase()
      if (g === 'A') return 'longevidata-grade longevidata-grade-a'
      if (g === 'B') return 'longevidata-grade longevidata-grade-b'
      if (g === 'C') return 'longevidata-grade longevidata-grade-c'
      if (g === 'D') return 'longevidata-grade longevidata-grade-d'
      return 'longevidata-grade'
    },

    gradeLabel(grade) {
      return (grade || '?').toUpperCase()
    },

    effectClass(direction) {
      const d = (direction || '').toLowerCase()
      if (d.includes('pos') || d.includes('inc')) return 'longevidata-effect longevidata-effect-positive'
      if (d.includes('neg') || d.includes('dec')) return 'longevidata-effect longevidata-effect-negative'
      return 'longevidata-effect longevidata-effect-neutral'
    },

    effectLabel(outcome) {
      const mag = outcome.magnitude || ''
      const dir = outcome.effect_direction || ''
      if (mag && dir) return `${mag} ${dir}`
      return dir || 'No Effect'
    },

    isFirstLocked(outcomes, idx) {
      // It is first locked if this one is locked AND (it's the first element OR the previous one was NOT locked)
      if (!outcomes[idx].isLocked) return false
      if (idx === 0) return true
      return !outcomes[idx - 1].isLocked
    }
  }
}
</script>

<style lang="scss">
.longevidata-widget {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin: 1.5rem 0;
  background: white;

  .longevidata-header {
    background: #2c0b49; // Dark purple from description
    color: white;
    padding: 1rem;

    h4 {
      margin: 0;
      color: white;
      font-size: 1.1rem;
      font-weight: 500;
    }
  }

  .longevidata-toolbar-merged {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #eee;
    background: #f9f9f9;
    gap: 16px;
    flex-wrap: nowrap;

    .longevidata-search-wrapper {
      flex: 1;
      display: flex;
      position: relative;
      min-width: 0; // Fix flex child overflow

      input.longevidata-search-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.95rem;
        background: white;
        color: #333;
        -webkit-appearance: none;

        &:focus {
          outline: none;
          border-color: #5c2b90;
          box-shadow: 0 0 0 2px rgba(92, 43, 144, 0.1);
        }
      }

      .longevidata-search-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        border: none;
        background: none;
        color: #666;
        cursor: pointer;
        padding: 4px;
      }
    }

    .longevidata-controls-right {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    }

    .longevidata-toggle-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .toggle-label {
        font-size: 0.9rem;
        color: #555;
        font-weight: 500;
        white-space: nowrap;
      }

      /* Custom Switch */
      .switch {
        position: relative;
        display: inline-block;
        width: 36px;
        height: 20px;
        flex-shrink: 0;
        
        input { 
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          -webkit-transition: .4s;
          transition: .4s;
          
          &:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            -webkit-transition: .4s;
            transition: .4s;
          }
          
          &.round {
            border-radius: 20px;
            &:before { border-radius: 50%; }
          }
        }
        
        input:checked + .slider {
          background-color: #5c2b90;
        }
        
        input:focus + .slider {
          box-shadow: 0 0 1px #5c2b90;
        }
        
        input:checked + .slider:before {
          -webkit-transform: translateX(16px);
          -ms-transform: translateX(16px);
          transform: translateX(16px);
        }
      }
    }

    .longevidata-actions {
      display: flex;
      gap: 8px;
    }
    
    .text-btn {
      background: none;
      border: 1px solid transparent; // Consistent sizing
      color: #666;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 4px;
      white-space: nowrap;
      
      &:hover {
        background-color: rgba(0,0,0,0.05);
        color: #333;
      }
    }
  }

  // Responsive Styles
  @media (max-width: 600px) {
    .longevidata-toolbar-merged {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      padding: 0.75rem;

      .longevidata-controls-right {
        justify-content: space-between;
        width: 100%;
      }
    }

    // Hide Evidence column on mobile
    th.col-evidence, 
    td.col-evidence {
      display: none;
    }
    
    // Adjust font sizes for mobile table
    .longevidata-table {
      font-size: 0.9rem;
      
      th, td {
        padding: 0.5rem 0.5rem;
      }
    }
  }

  .longevidata-table {
    width: 100%;
    border-collapse: separate; // Important for border styling
    border-spacing: 0;
    
    // RESET Global table styles
    margin: 0 !important; // Remove global margins
    border: none !important;

    th {
      text-align: left;
      padding: 0.75rem 1rem;
      font-weight: 600;
      color: #555 !important;
      background: #f9f9f9 !important; // Force override of global table styles
      cursor: pointer;
      user-select: none;
      border: none !important; // Reset global

      &:hover {
        background: #f0f0f0 !important;
      }
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
      border-top: none; // Reset global
      border-left: none;
      border-right: none;
    }

    .longevidata-group-row {
      background: #fcfcfc;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: #f0f0f0;
      }

      td {
        color: #333;
        border-bottom: 1px solid #eee;
      }
    }

    .longevidata-outcome-row {
      background: white;
      
      &.is-locked {
        background: #fafafa;
        color: #888;
        
        td {
          border-bottom: 1px solid #eee;
        }
      }
    }
    
    .longevidata-locked-cta-row {
      background: #f3e5f5; // Light purple background
      
      td {
        padding: 1.5rem;
        text-align: center;
        border-bottom: 1px solid #eee;
      }
      
      .locked-text {
        font-weight: 500;
        color: #4a148c;
        
        a {
          color: #4a148c;
          text-decoration: underline;
          font-weight: 700;
        }
      }
    }
  }

  .table-responsive {
    position: relative;
    border-top: 1px solid #eee; // Add border between toolbar and table
  }

  .longevidata-loading {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.9);
    z-index: 2;
    border-bottom: 1px solid #eee;
  }

  .longevidata-tier-separator {
    border-top: 1px dashed #c7c7c7;
    padding: 1rem;
    text-align: center;
    font-weight: 600;
    color: #5c2b90;
    cursor: pointer;
  }

  // Badges
  .longevidata-grade {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    color: white;
    font-weight: bold;
    font-size: 0.85rem;

    &-a { background-color: #2e7d32; } // Green
    &-b { background-color: #827717; } // Olive
    &-c { background-color: #ef6c00; } // Orange
    &-d { background-color: #c62828; } // Red
  }

  .longevidata-effect {
    font-weight: 500;

    &-positive { color: #2e7d32; }
    &-negative { color: #c62828; }
    &-neutral { color: #666; }
  }

  // Locked State
  .locked-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background-color: #d1c4e9; // Light purple
    color: #512da8; // Dark purple
    
    .mdi {
      font-size: 16px;
    }
  }
  
  .locked-text-sm {
    color: #999;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  // Static rendering specific (for when !hydrated)
  &-static {
    // Inherits styles from above nesting
  }
}
</style>
