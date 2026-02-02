/* global WIKI */

exports.up = async knex => {
  const hasTable = await knex.schema.hasTable('membership_tiers')
  if (!hasTable) {
    await knex.schema.createTable('membership_tiers', table => {
      table.increments('id').primary()
      table.string('key').notNullable().unique()
      table.string('name').notNullable()
      table.text('description')
      table.integer('sortOrder').notNullable().defaultTo(0)
      table.boolean('isDefault').notNullable().defaultTo(false)
      table.boolean('isActive').notNullable().defaultTo(true)
      table.json('features').notNullable().defaultTo('[]')
      table.integer('maxLongevidataRows').nullable()
      table.string('stripeProductId').nullable()
      table.string('stripePriceId').nullable()
      table.string('createdAt').notNullable()
      table.string('updatedAt').notNullable()
    })
  }

  const hasUsers = await knex.schema.hasTable('users')
  if (hasUsers) {
    const hasTierId = await knex.schema.hasColumn('users', 'membershipTierId')
    if (!hasTierId) {
      await knex.schema.alterTable('users', table => {
        table.integer('membershipTierId').nullable()
        table.string('membershipExpiresAt').nullable()
      })
    }
  }

  if (!hasTable) {
    const now = new Date().toISOString()
    await knex('membership_tiers').insert([
      {
        key: 'free',
        name: 'Free',
        description: 'Preview access to longevidata outcomes.',
        sortOrder: 1,
        isDefault: true,
        isActive: true,
        features: JSON.stringify(['Preview access to longevidata outcomes']),
        maxLongevidataRows: 4,
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'plus',
        name: 'Plus',
        description: 'Expanded access for members.',
        sortOrder: 2,
        isDefault: false,
        isActive: true,
        features: JSON.stringify(['Expanded longevidata access']),
        maxLongevidataRows: 10,
        createdAt: now,
        updatedAt: now
      },
      {
        key: 'pro',
        name: 'Pro',
        description: 'Unlimited longevidata access.',
        sortOrder: 3,
        isDefault: false,
        isActive: true,
        features: JSON.stringify(['Unlimited longevidata access']),
        maxLongevidataRows: null,
        createdAt: now,
        updatedAt: now
      }
    ])
  }

  if (hasUsers) {
    const defaultTier = await knex('membership_tiers').where({ key: 'free' }).first()
    if (defaultTier) {
      await knex('users').whereNull('membershipTierId').update({
        membershipTierId: defaultTier.id
      })
    }
  }
}

exports.down = async knex => {
  const hasUsers = await knex.schema.hasTable('users')
  if (hasUsers) {
    const hasTierId = await knex.schema.hasColumn('users', 'membershipTierId')
    if (hasTierId) {
      await knex.schema.alterTable('users', table => {
        table.dropColumn('membershipTierId')
        table.dropColumn('membershipExpiresAt')
      })
    }
  }

  const hasTable = await knex.schema.hasTable('membership_tiers')
  if (hasTable) {
    await knex.schema.dropTable('membership_tiers')
  }
}
