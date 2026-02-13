const Model = require('objection').Model
const moment = require('moment')

/* global WIKI */

/**
 * Membership tiers model
 */
module.exports = class MembershipTier extends Model {
  static get tableName() { return 'membership_tiers' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: ['key', 'name'],

      properties: {
        id: {type: 'integer'},
        key: {type: 'string'},
        name: {type: 'string'},
        description: {type: ['string', 'null']},
        sortOrder: {type: ['integer', 'null']},
        isDefault: {type: 'boolean'},
        isActive: {type: 'boolean'},
        features: {type: ['array', 'null']},
        maxLongevidataRows: {type: ['integer', 'null']},
        lockedMessageKey: {type: ['string', 'null']},
        stripeProductId: {type: ['string', 'null']},
        stripePriceId: {type: ['string', 'null']},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
      }
    }
  }

  static get jsonAttributes() {
    return ['features']
  }

  static get relationMappings() {
    return {
      users: {
        relation: Model.HasManyRelation,
        modelClass: require('./users'),
        join: {
          from: 'membership_tiers.id',
          to: 'users.membershipTierId'
        }
      }
    }
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString()
  }

  $beforeInsert() {
    this.createdAt = new Date().toISOString()
    this.updatedAt = new Date().toISOString()
  }

  static async getDefault() {
    let tier = await this.query().where({ isDefault: true, isActive: true }).first()
    if (!tier) {
      tier = await this.query().where({ isActive: true }).orderBy('sortOrder', 'asc').first()
    }
    return tier
  }

  static async getEffectiveForUser(user) {
    try {
      let defaultTier = null
      let hasResolvedDefaultTier = false
      const getDefaultTierSafe = async () => {
        if (hasResolvedDefaultTier) {
          return defaultTier
        }
        hasResolvedDefaultTier = true
        try {
          defaultTier = await this.getDefault()
        } catch (err) {
          WIKI.logger.warn(`Failed to resolve default membership tier: ${err.message}`)
          defaultTier = null
        }
        return defaultTier
      }

      // 1. Handle Guest / System User
      if (!user || !user.id || user.id === 2) {
        // Check for specific 'guest' tier first
        const guestTier = await this.query().where({ key: 'guest', isActive: true }).first()
        if (guestTier) {
          return guestTier
        }
        // Fallback to default
        return getDefaultTierSafe()
      }

      let userData = user
      if (user.membershipTierId === undefined && user.membershipExpiresAt === undefined) {
        userData = await WIKI.models.users.query()
          .select('id', 'membershipTierId', 'membershipExpiresAt')
          .findById(user.id)
      }

      if (!userData || !userData.membershipTierId) {
        return getDefaultTierSafe()
      }

      const tier = await this.query().findById(userData.membershipTierId)
      if (!tier || !tier.isActive) {
        return getDefaultTierSafe()
      }

      if (userData.membershipExpiresAt) {
        const expiresAt = moment(userData.membershipExpiresAt)
        if (expiresAt.isValid() && expiresAt.isSameOrBefore(moment())) {
          return getDefaultTierSafe()
        }
      }

      return tier
    } catch (err) {
      WIKI.logger.warn(`Failed to resolve effective membership tier: ${err.message}`)
      return null
    }
  }
}
