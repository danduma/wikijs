<template lang='pug'>
  v-container(fluid, grid-list-lg)
    v-layout(row wrap)
      v-flex(xs12)
        .admin-header
          img.animated.fadeInUp(src='/_assets/svg/icon-people.svg', alt='Membership', style='width: 80px;')
          .admin-header-title
            .headline.blue--text.text--darken-2.animated.fadeInLeft Membership Tiers
            .subtitle-1.grey--text.animated.fadeInLeft.wait-p2s Manage membership tiers and access limits
          v-spacer
          v-btn.animated.fadeInDown.wait-p2s.mx-3(color='grey', outlined, @click='refresh', icon)
            v-icon mdi-refresh
          v-btn.animated.fadeInDown(color='primary', depressed, @click='startNewTier', large)
            v-icon(left) mdi-plus
            span New Tier
      v-flex(xs12 md4)
        v-card.animated.fadeInUp
          v-toolbar(color='primary', dense, dark, flat)
            v-icon.mr-2 mdi-card-account-details
            span Tiers
          v-list(two-line)
            v-list-item(
              v-for='tier in tiers'
              :key='tier.id'
              :class='{ "grey lighten-4": tier.id === selectedTierId }'
              @click='selectTier(tier)'
            )
              v-list-item-content
                v-list-item-title
                  strong {{ tier.name }}
                  v-chip.ml-2(x-small, v-if='tier.isDefault', color='green', text-color='white') Default
                  v-chip.ml-2(x-small, v-if='!tier.isActive', color='grey', text-color='white') Inactive
                v-list-item-subtitle
                  span {{ tier.key }} · {{ tier.displayPrice || 'Price set in code' }}
              v-list-item-action
                v-chip(x-small, color='grey lighten-3') {{ tier.userCount || 0 }} users
          v-divider
          v-card-actions
            v-btn(text, color='grey darken-1', @click='openBulkMigrate') Bulk Migrate Users
      v-flex(xs12 md8)
        v-card.animated.fadeInUp
          v-toolbar(color='primary', dense, dark, flat)
            v-icon.mr-2 mdi-pencil
            span {{ selectedTierId ? 'Edit Tier' : 'Create Tier' }}
          v-card-text
            v-layout(row wrap)
              v-flex(xs12 md6)
                v-text-field(
                  v-model='form.key'
                  label='Key'
                  outlined
                  hint='Unique slug (e.g. free, plus, pro)'
                  persistent-hint
                )
              v-flex(xs12 md6)
                v-text-field(
                  v-model='form.name'
                  label='Name'
                  outlined
                )
              v-flex(xs12)
                v-textarea(
                  v-model='form.description'
                  label='Description'
                  outlined
                  rows='2'
                )
              v-flex(xs12 md6)
                v-text-field(
                  v-model.number='form.sortOrder'
                  label='Sort Order'
                  type='number'
                  outlined
                )
              v-flex(xs12 md6)
                v-text-field(
                  :value='selectedTierDisplayPrice'
                  label='Display Price (code-driven)'
                  outlined
                  disabled
                )
              v-flex(xs12 md6)
                v-text-field(
                  v-model='form.maxLongevidataRows'
                  label='Max Longevidata Rows (blank = unlimited)'
                  type='number'
                  outlined
                )
              v-flex(xs12 md6)
                v-switch(
                  v-model='form.isActive'
                  label='Active'
                  inset
                )
              v-flex(xs12 md6)
                v-switch(
                  v-model='form.isDefault'
                  label='Default Tier'
                  inset
                )
              v-flex(xs12)
                v-combobox(
                  v-model='form.features'
                  label='Features'
                  outlined
                  multiple
                  chips
                  deletable-chips
                  hint='Press Enter to add a feature'
                  persistent-hint
                )
              v-flex(xs12 md6)
                v-text-field(
                  v-model='form.stripeProductId'
                  label='Stripe Product ID'
                  outlined
                )
              v-flex(xs12 md6)
                v-text-field(
                  v-model='form.stripePriceId'
                  label='Stripe Price ID'
                  outlined
                )
          v-divider
          v-card-actions
            v-spacer
            v-btn(text, color='grey', @click='resetForm') Reset
            v-btn(color='primary', @click='saveTier') Save
            v-btn(color='red', text, v-if='selectedTierId', @click='openDeleteDialog') Delete

    v-dialog(v-model='deleteDialog', max-width='500')
      v-card
        .dialog-header.is-short Delete Tier
        v-card-text.pt-4
          p Select a tier to migrate existing users to.
          v-select(
            v-model='deleteTargetId'
            :items='deleteTargets'
            item-text='name'
            item-value='id'
            label='Migrate users to'
            outlined
          )
        v-card-actions
          v-spacer
          v-btn(text, @click='deleteDialog = false') Cancel
          v-btn(color='red', @click='confirmDelete') Delete

    v-dialog(v-model='bulkDialog', max-width='500')
      v-card
        .dialog-header.is-short Bulk Migrate Users
        v-card-text.pt-4
          v-select(
            v-model='bulkFromId'
            :items='tiers'
            item-text='name'
            item-value='id'
            label='From Tier'
            outlined
          )
          v-select(
            v-model='bulkToId'
            :items='tiers'
            item-text='name'
            item-value='id'
            label='To Tier'
            outlined
          )
        v-card-actions
          v-spacer
          v-btn(text, @click='bulkDialog = false') Cancel
          v-btn(color='primary', @click='confirmBulkMigrate') Migrate
</template>

<script>
import _ from 'lodash'

import tiersQuery from 'gql/admin/membership/membership-query-tiers.gql'
import createTierMutation from 'gql/admin/membership/membership-mutation-create-tier.gql'
import updateTierMutation from 'gql/admin/membership/membership-mutation-update-tier.gql'
import deleteTierMutation from 'gql/admin/membership/membership-mutation-delete-tier.gql'
import bulkMigrateMutation from 'gql/admin/membership/membership-mutation-bulk-migrate.gql'

export default {
  data() {
    return {
      tiers: [],
      loading: false,
      selectedTierId: null,
      form: this.emptyForm(),
      deleteDialog: false,
      deleteTargetId: null,
      bulkDialog: false,
      bulkFromId: null,
      bulkToId: null
    }
  },
  computed: {
    selectedTier() {
      return _.find(this.tiers, ['id', this.selectedTierId]) || null
    },
    selectedTierDisplayPrice() {
      return _.get(this.selectedTier, 'displayPrice', '')
    },
    deleteTargets() {
      return this.tiers.filter(t => t.id !== this.selectedTierId)
    }
  },
  methods: {
    emptyForm() {
      return {
        key: '',
        name: '',
        description: '',
        sortOrder: 0,
        isDefault: false,
        isActive: true,
        features: [],
        maxLongevidataRows: '',
        stripeProductId: '',
        stripePriceId: ''
      }
    },
    selectTier(tier) {
      this.selectedTierId = tier.id
      this.form = {
        key: tier.key || '',
        name: tier.name || '',
        description: tier.description || '',
        sortOrder: tier.sortOrder || 0,
        isDefault: !!tier.isDefault,
        isActive: !!tier.isActive,
        features: tier.features || [],
        maxLongevidataRows: _.isNil(tier.maxLongevidataRows) ? '' : String(tier.maxLongevidataRows),
        stripeProductId: tier.stripeProductId || '',
        stripePriceId: tier.stripePriceId || ''
      }
    },
    startNewTier() {
      this.selectedTierId = null
      this.form = this.emptyForm()
    },
    resetForm() {
      if (this.selectedTierId && this.selectedTier) {
        this.selectTier(this.selectedTier)
      } else {
        this.form = this.emptyForm()
      }
    },
    normalizeMaxRows() {
      if (this.form.maxLongevidataRows === '' || this.form.maxLongevidataRows === null) return null
      const num = _.toSafeInteger(this.form.maxLongevidataRows)
      return Number.isFinite(num) && num >= 0 ? num : null
    },
    async refresh() {
      await this.$apollo.queries.tiers.refetch()
      this.$store.commit('showNotification', {
        message: 'Membership tiers refreshed.',
        style: 'success',
        icon: 'cached'
      })
    },
    async saveTier() {
      const payload = {
        key: _.trim(this.form.key),
        name: _.trim(this.form.name),
        description: _.trim(this.form.description),
        sortOrder: _.toSafeInteger(this.form.sortOrder),
        isDefault: this.form.isDefault,
        isActive: this.form.isActive,
        features: _.compact(this.form.features || []),
        maxLongevidataRows: this.normalizeMaxRows(),
        stripeProductId: _.trim(this.form.stripeProductId) || null,
        stripePriceId: _.trim(this.form.stripePriceId) || null
      }

      try {
        if (this.selectedTierId) {
          const resp = await this.$apollo.mutate({
            mutation: updateTierMutation,
            variables: {
              id: this.selectedTierId,
              ...payload
            }
          })
          if (_.get(resp, 'data.membership.updateTier.responseResult.succeeded', false)) {
            this.$store.commit('showNotification', {
              style: 'success',
              message: 'Tier updated successfully.',
              icon: 'check'
            })
            await this.refresh()
          } else {
            throw new Error(_.get(resp, 'data.membership.updateTier.responseResult.message', 'Failed to update tier'))
          }
        } else {
          const resp = await this.$apollo.mutate({
            mutation: createTierMutation,
            variables: payload
          })
          if (_.get(resp, 'data.membership.createTier.responseResult.succeeded', false)) {
            this.$store.commit('showNotification', {
              style: 'success',
              message: 'Tier created successfully.',
              icon: 'check'
            })
            await this.refresh()
          } else {
            throw new Error(_.get(resp, 'data.membership.createTier.responseResult.message', 'Failed to create tier'))
          }
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    },
    openDeleteDialog() {
      this.deleteDialog = true
      this.deleteTargetId = null
    },
    async confirmDelete() {
      if (!this.deleteTargetId) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: 'Select a migration target tier.',
          icon: 'warning'
        })
        return
      }
      try {
        const resp = await this.$apollo.mutate({
          mutation: deleteTierMutation,
          variables: {
            id: this.selectedTierId,
            migrateTo: this.deleteTargetId
          }
        })
        if (_.get(resp, 'data.membership.deleteTier.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: 'Tier deleted successfully.',
            icon: 'check'
          })
          this.deleteDialog = false
          this.startNewTier()
          await this.refresh()
        } else {
          throw new Error(_.get(resp, 'data.membership.deleteTier.responseResult.message', 'Failed to delete tier'))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    },
    openBulkMigrate() {
      this.bulkDialog = true
      this.bulkFromId = null
      this.bulkToId = null
    },
    async confirmBulkMigrate() {
      if (!this.bulkFromId || !this.bulkToId || this.bulkFromId === this.bulkToId) {
        this.$store.commit('showNotification', {
          style: 'red',
          message: 'Select two different tiers to migrate.',
          icon: 'warning'
        })
        return
      }
      try {
        const resp = await this.$apollo.mutate({
          mutation: bulkMigrateMutation,
          variables: {
            fromTierId: this.bulkFromId,
            toTierId: this.bulkToId
          }
        })
        if (_.get(resp, 'data.membership.bulkMigrateUsers.responseResult.succeeded', false)) {
          this.$store.commit('showNotification', {
            style: 'success',
            message: 'Users migrated successfully.',
            icon: 'check'
          })
          this.bulkDialog = false
          await this.refresh()
        } else {
          throw new Error(_.get(resp, 'data.membership.bulkMigrateUsers.responseResult.message', 'Failed to migrate users'))
        }
      } catch (err) {
        this.$store.commit('pushGraphError', err)
      }
    }
  },
  apollo: {
    tiers: {
      query: tiersQuery,
      fetchPolicy: 'network-only',
      update: data => data.membership.tiers,
      watchLoading(isLoading) {
        this.loading = isLoading
      },
      result({ data }) {
        if (!this.selectedTierId && data && data.membership && data.membership.tiers.length > 0) {
          this.selectTier(data.membership.tiers[0])
        }
      }
    }
  }
}
</script>

<style lang='scss'>
</style>
