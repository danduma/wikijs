'use strict';

const RateLimiterStoreAbstract = require('rate-limiter-flexible/lib/RateLimiterStoreAbstract');
const RateLimiterRes = require('rate-limiter-flexible/lib/RateLimiterRes');

class RateLimiterKnex extends RateLimiterStoreAbstract {
  constructor(opts, cb = null) {
    super(opts);

    this.tableName = opts.tableName;
    this.tableCreated = opts.tableCreated;
    this.storeClient = opts.storeClient;

    if (typeof cb === 'function') {
      cb();
    }
  }

  get client() {
    return this.storeClient;
  }

  _getRateLimiterRes(rlKey, changedPoints, storeResult) {
    const res = new RateLimiterRes();
    const { points, expire } = storeResult;

    res.isFirstInDuration = changedPoints === points;
    res.consumedPoints = points;
    res.remainingPoints = Math.max(this.points - points, 0);
    res.msBeforeNext = expire ? Math.max(expire - Date.now(), 0) : -1;

    return res;
  }

  async _upsert(rlKey, points, msDuration, forceExpire = false, options = {}) {
    const now = Date.now();
    const newExpire = msDuration > 0 ? now + msDuration : null;

    // Try insert first, on conflict update
    const row = await this.client(this.tableName).where('key', rlKey).first();

    if (!row) {
      try {
        await this.client(this.tableName).insert({
          key: rlKey,
          points: points,
          expire: newExpire
        });
        return { points, expire: newExpire };
      } catch (err) {
        // Race condition: another request inserted between our SELECT and INSERT
        // Fall through to update path
        const raceRow = await this.client(this.tableName).where('key', rlKey).first();
        if (!raceRow) throw err;
        return this._updateRow(rlKey, raceRow, points, newExpire, forceExpire, now);
      }
    }

    return this._updateRow(rlKey, row, points, newExpire, forceExpire, now);
  }

  async _updateRow(rlKey, row, points, newExpire, forceExpire, now) {
    let updatedPoints = points;
    let updatedExpire = newExpire;

    if (forceExpire || (row.expire && row.expire <= now)) {
      updatedPoints = points;
    } else {
      updatedPoints = row.points + points;
      updatedExpire = row.expire;
    }

    await this.client(this.tableName)
      .where('key', rlKey)
      .update({
        points: updatedPoints,
        expire: updatedExpire
      });

    return { points: updatedPoints, expire: updatedExpire };
  }

  _get(rlKey, options = {}) {
    return this.client(this.tableName)
      .where('key', rlKey)
      .andWhere(function () {
        this.where('expire', '>', Date.now()).orWhereNull('expire');
      })
      .first()
      .then((row) => {
        if (!row) return null;
        return {
          points: row.points,
          expire: row.expire
        };
      });
  }

  _delete(rlKey, options = {}) {
    return this.client(this.tableName)
      .where('key', rlKey)
      .del()
      .then((count) => count > 0);
  }
}

module.exports = RateLimiterKnex;
