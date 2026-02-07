const _ = require('lodash')
const graphHelper = require('../../helpers/graph')
const membership = require('../../core/membership')

/* global WIKI */

function buildPublicTier(tier, ctx) {
  const presentation = membership.getPublicTierPresentation(tier, ctx)
  return {
    key: tier.key,
    name: tier.name,
    description: tier.description,
    sortOrder: tier.sortOrder,
    isDefault: tier.isDefault,
    features: tier.features || [],
    maxLongevidataRows: tier.maxLongevidataRows,
    lockedMessageKey: tier.lockedMessageKey,
    displayPrice: presentation.displayPrice,
    currency: presentation.currency,
    billingPeriod: presentation.billingPeriod,
    ctaText: presentation.ctaText,
    badgeText: presentation.badgeText
  }
}

function buildAdminTier(tier, ctx) {
  const presentation = membership.getPublicTierPresentation(tier, ctx)
  return {
    ...tier,
    features: tier.features || [],
    displayPrice: presentation.displayPrice,
    currency: presentation.currency,
    billingPeriod: presentation.billingPeriod,
    ctaText: presentation.ctaText,
    badgeText: presentation.badgeText
  }
}

module.exports = {
  Query: {
    membership() { return {} }
  },
  Mutation: {
    membership() { return {} }
  },
  MembershipQuery: {
    async tiers(obj, args, context) {
      const rows = await WIKI.models.membershipTiers.query()
        .select('membership_tiers.*')
        .leftJoin('users', 'membership_tiers.id', 'users.membershipTierId')
        .groupBy('membership_tiers.id')
        .count('users.id as userCount')
        .orderBy('sortOrder', 'asc')

      return rows.map(row => ({
        ...buildAdminTier(row, context),
        userCount: _.toSafeInteger(row.userCount)
      }))
    },
    async activeTiers(obj, args, context) {
      const rows = await WIKI.models.membershipTiers.query()
        .where({ isActive: true })
        .orderBy('sortOrder', 'asc')
      return rows.map(row => buildPublicTier(row, context))
    },
    async currentUserTier(obj, args, context) {
      const tier = await WIKI.models.membershipTiers.getEffectiveForUser(context.req.user)
      if (!tier) return null
      return buildPublicTier(tier, context)
    }
  },
  MembershipMutation: {
    async createTier(obj, args, context) {
      try {
        const insertData = {
          key: _.trim(args.key),
          name: _.trim(args.name),
          description: _.get(args, 'description', null),
          sortOrder: _.get(args, 'sortOrder', 0),
          isDefault: _.get(args, 'isDefault', false),
          isActive: _.get(args, 'isActive', true),
          features: _.get(args, 'features', []),
          maxLongevidataRows: _.get(args, 'maxLongevidataRows', null),
          lockedMessageKey: _.get(args, 'lockedMessageKey', null),
          stripeProductId: _.get(args, 'stripeProductId', null),
          stripePriceId: _.get(args, 'stripePriceId', null)
        }

        let tier
        await WIKI.models.knex.transaction(async trx => {
          if (insertData.isDefault) {
            await WIKI.models.membershipTiers.query(trx).patch({ isDefault: false })
          }
          tier = await WIKI.models.membershipTiers.query(trx).insertAndFetch(insertData)
        })

        return {
          responseResult: graphHelper.generateSuccess('Tier created successfully'),
          tier: buildAdminTier(tier, context)
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },

    async updateTier(obj, args, context) {
      try {
        const tier = await WIKI.models.membershipTiers.query().findById(args.id)
        if (!tier) {
          throw new Error('Tier not found')
        }

        const patchData = _.pickBy({
          key: _.get(args, 'key'),
          name: _.get(args, 'name'),
          description: _.get(args, 'description'),
          sortOrder: _.get(args, 'sortOrder'),
          isDefault: _.get(args, 'isDefault'),
          isActive: _.get(args, 'isActive'),
          features: _.get(args, 'features'),
          maxLongevidataRows: _.get(args, 'maxLongevidataRows'),
          lockedMessageKey: _.get(args, 'lockedMessageKey'),
          stripeProductId: _.get(args, 'stripeProductId'),
          stripePriceId: _.get(args, 'stripePriceId')
        }, value => value !== undefined)

        await WIKI.models.knex.transaction(async trx => {
          if (patchData.isDefault === true) {
            await WIKI.models.membershipTiers.query(trx).patch({ isDefault: false })
          }
          await WIKI.models.membershipTiers.query(trx).patch(patchData).findById(args.id)
        })

        const updated = await WIKI.models.membershipTiers.query().findById(args.id)
        return {
          responseResult: graphHelper.generateSuccess('Tier updated successfully'),
          tier: buildAdminTier(updated, context)
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },

    async deleteTier(obj, args) {
      try {
        if (args.id === args.migrateTo) {
          throw new Error('Cannot migrate users to the same tier.')
        }

        const tier = await WIKI.models.membershipTiers.query().findById(args.id)
        const target = await WIKI.models.membershipTiers.query().findById(args.migrateTo)
        if (!tier || !target) {
          throw new Error('Tier not found')
        }

        await WIKI.models.knex.transaction(async trx => {
          await WIKI.models.users.query(trx).patch({ membershipTierId: args.migrateTo }).where('membershipTierId', args.id)
          await WIKI.models.membershipTiers.query(trx).deleteById(args.id)
        })

        return graphHelper.generateSuccess('Tier deleted successfully')
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },

    async assignUserTier(obj, args) {
      try {
        await WIKI.models.users.query().patch({
          membershipTierId: args.tierId,
          membershipExpiresAt: args.expiresAt || null
        }).findById(args.userId)

        return graphHelper.generateSuccess('User membership updated successfully')
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },

    async bulkMigrateUsers(obj, args) {
      try {
        if (args.fromTierId === args.toTierId) {
          throw new Error('Source and destination tiers must be different.')
        }
        await WIKI.models.users.query().patch({ membershipTierId: args.toTierId }).where('membershipTierId', args.fromTierId)
        return graphHelper.generateSuccess('Users migrated successfully')
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
