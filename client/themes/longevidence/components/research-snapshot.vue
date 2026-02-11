<template>
  <div class="research-snapshot">
    <div class="snapshot-header">
      <div class="snapshot-title">
        Research Snapshot
        <v-tooltip bottom>
          <template v-slot:activator="{ on, attrs }">
            <span
              v-bind="attrs"
              v-on="on"
              class="mdi mdi-information-outline ml-2 info-icon"
            />
          </template>
          <span>Aggregated data from LongeviData research database</span>
        </v-tooltip>
      </div>
    </div>

    <div v-if="loading" class="snapshot-loading">
      <v-progress-circular indeterminate color="white" size="24" />
    </div>
    
    <div v-else-if="!snapshot" class="snapshot-empty">
      <!-- Fallback or empty state -->
    </div>

    <div v-else class="snapshot-content">
      <div class="snapshot-stat-row">
        <span class="mdi mdi-file-document-outline icon" />
        <span>{{ snapshot.total_references }} references on this page</span>
      </div>
      
      <div class="snapshot-stat-row">
        <span class="mdi mdi-account-outline icon" />
        <span>
          {{ formatNumber(snapshot.total_participants) }} participants in 
          {{ snapshot.study_counts.trials || 0 }} trials and 
          {{ snapshot.study_counts['meta-analyses'] || 0 }} meta-analyses
        </span>
      </div>

      <div class="snapshot-grades-header">
        <span class="mdi mdi-view-grid-outline icon" />
        GRADE Evidence Certainty
      </div>

      <div class="snapshot-grades-list">
        <div 
          v-for="grade in ['high', 'moderate', 'low', 'very_low']" 
          :key="grade"
          v-if="snapshot.grade_distribution[grade]"
          class="grade-bar-container"
        >
          <div :class="['grade-bar', gradeClass(grade)]">
            <div class="grade-badge">{{ gradeBadgeLabel(grade) }}</div>
            <div class="grade-content">
              <span class="grade-outcomes">
                {{ formatOutcomesList(snapshot.top_outcomes_by_grade[grade], snapshot.grade_distribution[grade]) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ResearchSnapshot',
  props: {
    topic: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      snapshot: null
    }
  },
  watch: {
    topic: {
      immediate: true,
      handler(newVal) {
        if (newVal) this.fetchSnapshot()
      }
    }
  },
  methods: {
    async fetchSnapshot() {
      this.loading = true
      try {
        const res = await fetch(`/api/research/snapshot/${encodeURIComponent(this.topic)}`)
        if (res.ok) {
          this.snapshot = await res.json()
        } else {
          // If 404 or other error, just don't show stats
          this.snapshot = null
        }
      } catch (e) {
        console.error('Error fetching research snapshot', e)
        this.snapshot = null
      } finally {
        this.loading = false
      }
    },
    formatNumber(num) {
      return new Intl.NumberFormat().format(num)
    },
    formatOutcomesList(outcomes, totalCount) {
      if (!outcomes || outcomes.length === 0) return `${totalCount} outcomes`
      
      const first = outcomes[0]
      const remaining = totalCount - 1
      
      if (remaining > 0) {
        return `${first} + ${remaining} more`
      }
      return first
    },
    gradeClass(grade) {
      const g = String(grade || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
      if (g === 'high') return 'grade-high'
      if (g === 'moderate') return 'grade-moderate'
      if (g === 'low') return 'grade-low'
      if (g === 'very_low') return 'grade-very-low'
      return 'grade-low'
    },
    gradeBadgeLabel(grade) {
      const g = String(grade || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
      if (g === 'high') return 'High'
      if (g === 'moderate') return 'Moderate'
      if (g === 'low') return 'Low'
      if (g === 'very_low') return 'Very Low'
      return '?'
    }
  }
}
</script>

<style lang="scss" scoped>
.research-snapshot {
  background-color: #2c0b49; // Dark purple
  color: #e0e0e0;
  // No border radius here, handled by parent container or context
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  .snapshot-header {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    
    .snapshot-title {
      font-weight: 700;
      font-size: 1.1rem;
      color: white;
      display: flex;
      align-items: center;

      .info-icon {
        cursor: pointer;
        opacity: 0.7;
        &:hover { opacity: 1; }
      }
    }
  }

  .snapshot-loading {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  .snapshot-stat-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 8px;
    font-size: 0.95rem;
    color: #d1c4e9;
    line-height: 1.4;

    .icon {
      margin-top: 2px;
      margin-right: 8px;
      font-size: 1.1rem;
    }
  }

  .snapshot-grades-header {
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: 500;
    color: #d1c4e9;
    display: flex;
    align-items: center;

    .icon {
      margin-right: 8px;
      font-size: 1.1rem;
    }
  }

  .snapshot-grades-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .grade-bar-container {
    .grade-bar {
      display: flex;
      align-items: stretch;
      border-radius: 6px;
      overflow: hidden;
      height: 36px;
      color: black;
      font-weight: 500;
      
      &.grade-high { background: #a5d6a7; .grade-badge { background: #2e7d32; color: white; } }
      &.grade-moderate { background: #e6ee9c; .grade-badge { background: #dce775; color: black; font-weight: 700; } } 
      &.grade-low { background: #ffcc80; .grade-badge { background: #ffb74d; color: black; font-weight: 700; } } 
      &.grade-very-low { background: #ef9a9a; .grade-badge { background: #e57373; color: black; font-weight: 700; } } 
    }

    .grade-badge {
      min-width: 84px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
      padding: 0 8px;
    }

    .grade-content {
      padding: 0 12px;
      display: flex;
      align-items: center;
      flex-grow: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.95rem;
    }
    
    .grade-outcomes {
      font-weight: 500;
    }
  }
}
</style>
