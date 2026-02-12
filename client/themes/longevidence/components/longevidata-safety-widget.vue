<template>
  <div class="longevidata-safety-widget">
    <template v-if="!hydrated">
      <slot />
    </template>
    <template v-else>
      <div class="longevidata-header">
        <h4>LongeviData Safety: {{ config.name }}</h4>
      </div>

      <div class="longevidata-safety-toolbar">
        <input
          v-model="searchQuery"
          @input="debouncedSearch"
          type="text"
          class="longevidata-safety-input"
          placeholder="Filter safety data"
        >
        <select v-model="typeFilter" class="longevidata-safety-select">
          <option value="">All types</option>
          <option v-for="type in signalTypes" :key="type" :value="type">
            {{ typeLabel(type) }}
          </option>
        </select>
        <select v-model="severityFilter" class="longevidata-safety-select">
          <option value="">All severity</option>
          <option v-for="level in severityOptions" :key="level" :value="level">
            {{ severityLabel(level) }}
          </option>
        </select>
      </div>

      <div class="table-responsive">
        <div v-if="refreshing" class="longevidata-loading">
          <v-progress-circular indeterminate color="primary" />
          <span class="ml-3">Refreshing safety data...</span>
        </div>
        <table class="longevidata-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Safety Signal</th>
              <th>Severity</th>
              <th>Evidence</th>
              <th>Reference</th>
              <th>Reviewed</th>
            </tr>
          </thead>
          <tbody v-if="loading">
            <tr>
              <td colspan="6" class="text-center pa-4">Loading...</td>
            </tr>
          </tbody>
          <tbody v-else-if="filteredSignals.length === 0">
            <tr>
              <td colspan="6" class="text-center pa-4">No safety signals found.</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr
              v-for="(signal, idx) in filteredSignals"
              :key="'signal-' + idx"
              class="longevidata-outcome-row"
              :class="{ 'is-locked': signal.isLocked }"
            >
              <template v-if="signal.isLocked">
                <td><span class="mdi mdi-lock" /></td>
                <td>Locked</td>
                <td><span class="mdi mdi-lock" /></td>
                <td><span class="mdi mdi-lock" /></td>
                <td><span class="mdi mdi-lock" /></td>
                <td><span class="mdi mdi-lock" /></td>
              </template>
              <template v-else>
                <td>{{ typeLabel(signal.signal_type) }}</td>
                <td>
                  <div class="signal-title">{{ signal.title }}</div>
                  <div v-if="signal.summary" class="signal-summary">{{ signal.summary }}</div>
                </td>
                <td>
                  <span :class="severityClass(signal.severity)">{{ severityLabel(signal.severity) }}</span>
                </td>
                <td>{{ evidenceLabel(signal.evidence_level) }}</td>
                <td>
                  <a
                    v-if="signal.reference_url"
                    :href="signal.reference_url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ signal.reference_title || signal.reference_url }}
                  </a>
                  <span v-else>-</span>
                </td>
                <td>{{ formatReviewed(signal.reviewed_at) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="showPaywallCta"
        class="longevidata-tier-separator"
        @click="openPaywall"
      >
        Unlock more safety rows with a membership tier
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
  name: 'LongeviDataSafety',
  components: {
    MembershipPaywall
  },
  props: {
    intervention: { type: String, default: null },
    condition: { type: String, default: null },
    name: { type: String, default: 'Safety Information' },
    initialData: { type: String, default: null }
  },
  inject: {
    membershipInfo: { default: null }
  },
  data () {
    return {
      hydrated: false,
      loading: false,
      refreshing: false,
      config: {
        type: 'intervention',
        entityId: null,
        name: ''
      },
      signals: [],
      totalSignals: 0,
      searchQuery: '',
      typeFilter: '',
      severityFilter: '',
      maxRows: null,
      tierKey: 'free',
      lockedMessageKey: null,
      paywallShown: false
    }
  },
  computed: {
    signalTypes () {
      return [...new Set(this.signals.map(s => s.signal_type).filter(Boolean))].sort()
    },
    severityOptions () {
      return [...new Set(this.signals.map(s => s.severity).filter(Boolean))].sort()
    },
    filteredSignals () {
      let list = this.signals || []
      if (this.typeFilter) {
        list = list.filter(s => s.signal_type === this.typeFilter)
      }
      if (this.severityFilter) {
        list = list.filter(s => s.severity === this.severityFilter)
      }
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase()
        list = list.filter(s => {
          return (
            (s.title && s.title.toLowerCase().includes(q)) ||
            (s.summary && s.summary.toLowerCase().includes(q)) ||
            (s.signal_type && s.signal_type.toLowerCase().includes(q)) ||
            (s.reference_title && s.reference_title.toLowerCase().includes(q))
          )
        })
      }
      return list
    },
    showPaywallCta () {
      if (this.maxRows === null || this.maxRows === undefined) return false
      return this.totalSignals > this.signals.length
    }
  },
  mounted () {
    const $el = this.$el
    const interventionId = this.intervention || $el.getAttribute('intervention')
    const conditionId = this.condition || $el.getAttribute('condition')
    this.config.name = this.name || $el.getAttribute('name') || 'Safety Information'

    if (conditionId) {
      this.config.type = 'condition'
      this.config.entityId = conditionId
    } else {
      this.config.type = 'intervention'
      this.config.entityId = interventionId
    }

    const initialDataStr = this.initialData || $el.getAttribute('data-initial')
    if (initialDataStr) {
      try {
        const jsonStr = Base64.decode(initialDataStr)
        const data = JSON.parse(jsonStr)
        this.signals = data.signals || []
        this.totalSignals = data.totalSignals || this.signals.length
      } catch (e) {
        console.error('Failed to parse initial safety data', e)
      }
    }

    if (this.membershipInfo) {
      this.maxRows = this.membershipInfo.maxRows
      this.tierKey = this.membershipInfo.tierKey || this.tierKey
    }

    this.hydrated = true
    this.refreshSafetySignals()
  },
  methods: {
    debouncedSearch: _.debounce(function () {}, 300),
    async refreshSafetySignals () {
      this.refreshing = true
      try {
        const params = new URLSearchParams()
        if (this.config.type === 'intervention') params.append('intervention_id', this.config.entityId)
        if (this.config.type === 'condition') params.append('condition_id', this.config.entityId)

        const res = await fetch(`/api/longevidata/safety?${params.toString()}`)
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`)
        }
        const data = await res.json()
        this.signals = data.signals || []
        this.totalSignals = data.totalSignals || this.signals.length
        if (data.maxRows !== undefined) this.maxRows = data.maxRows
        if (data.tierKey) this.tierKey = data.tierKey
        if (data.lockedMessageKey) this.lockedMessageKey = data.lockedMessageKey
      } catch (err) {
        console.error('Failed to refresh longevidata safety signals', err)
      } finally {
        this.refreshing = false
      }
    },
    openPaywall () {
      this.paywallShown = true
    },
    typeLabel (type) {
      const labels = {
        side_effect: 'Side effect',
        interaction: 'Interaction',
        contraindication: 'Contraindication',
        pregnancy: 'Pregnancy',
        lactation: 'Lactation',
        precaution: 'Precaution',
        wada: 'WADA',
        quality: 'Quality',
        other: 'Other'
      }
      return labels[type] || 'Other'
    },
    severityLabel (severity) {
      const labels = {
        mild: 'Mild',
        moderate: 'Moderate',
        severe: 'Severe',
        avoid: 'Avoid',
        unknown: 'Unknown'
      }
      return labels[severity] || 'Unknown'
    },
    severityClass (severity) {
      if (severity === 'avoid' || severity === 'severe') return 'longevidata-grade longevidata-grade-low'
      if (severity === 'moderate') return 'longevidata-grade longevidata-grade-moderate'
      if (severity === 'mild') return 'longevidata-grade longevidata-grade-high'
      return 'longevidata-grade'
    },
    evidenceLabel (level) {
      const labels = {
        high: 'High',
        moderate: 'Moderate',
        low: 'Low',
        very_low: 'Very low',
        case_report: 'Case report',
        theoretical: 'Theoretical',
        unknown: 'Unknown'
      }
      return labels[level] || 'Unknown'
    },
    formatReviewed (value) {
      if (!value) return '-'
      try {
        return new Date(value).toISOString().slice(0, 10)
      } catch (err) {
        return '-'
      }
    }
  }
}
</script>

<style lang="scss">
.longevidata-safety-widget {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  margin: 1.5rem 0;
  background: white;

  .longevidata-safety-toolbar {
    display: flex;
    gap: 8px;
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    flex-wrap: wrap;
  }

  .longevidata-safety-input,
  .longevidata-safety-select {
    height: 36px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 0 10px;
    font-size: 14px;
    background: #fff;
  }

  .longevidata-safety-input {
    min-width: 220px;
    flex: 1 1 240px;
  }

  .signal-title {
    font-weight: 600;
  }

  .signal-summary {
    margin-top: 4px;
    font-size: 12px;
    color: #666;
  }
}
</style>
