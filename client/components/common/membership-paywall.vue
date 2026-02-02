<template lang='pug'>
  v-dialog(:value='value', @input='updateValue', max-width='960')
    v-card
      v-toolbar(color='primary', dense, dark, flat)
        v-icon.mr-2 mdi-card-account-details
        span Membership Options
        v-spacer
        v-btn(icon, @click='updateValue(false)')
          v-icon mdi-close
      v-card-text
        v-row
          v-col(v-for='tier in tiers', :key='tier.key', cols='12', md='4')
            v-card(outlined, elevation='0')
              v-card-title
                span.text-h6 {{ tier.name }}
                v-spacer
                v-chip(x-small, v-if='tier.badgeText', color='purple', text-color='white') {{ tier.badgeText }}
              v-card-subtitle
                span {{ tier.description }}
              v-card-text
                .text-h5.font-weight-bold.mb-2 {{ tier.displayPrice }}
                .caption.grey--text(v-if='tier.billingPeriod') Billed {{ tier.billingPeriod }}
                ul.mt-3
                  li(v-for='(feature, idx) in tier.features', :key='`feat-` + tier.key + idx') {{ feature }}
              v-card-actions
                v-btn(color='primary', block, @click='goToAuth') {{ tier.ctaText || 'Get Started' }}
</template>

<script>
import activeTiersQuery from 'gql/admin/membership/membership-query-active-tiers.gql'

export default {
  name: 'MembershipPaywall',
  props: {
    value: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      tiers: []
    }
  },
  methods: {
    updateValue(val) {
      this.$emit('input', val)
    },
    goToAuth() {
      window.location.href = '/register'
    }
  },
  apollo: {
    tiers: {
      query: activeTiersQuery,
      fetchPolicy: 'network-only',
      update: data => data.membership.activeTiers
    }
  }
}
</script>

<style lang='scss'>
</style>
