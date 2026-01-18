const _ = require('lodash')

/* global WIKI */

const MAX_LOG_CHARS = 8000
const trimLog = (log) => {
  if (!log) return log
  return log.length > MAX_LOG_CHARS ? log.slice(log.length - MAX_LOG_CHARS) : log
}

module.exports = async (targetKey) => {
  const logLines = [`[${new Date().toISOString()}] Sync start: ${targetKey}`]
  WIKI.logger.info(`Syncing with storage target ${targetKey}...`)

  try {
    const target = _.find(WIKI.models.storage.targets, ['key', targetKey])
    if (target) {
      await target.fn.sync()
      WIKI.logger.info(`Syncing with storage target ${targetKey}: [ COMPLETED ]`)
      logLines.push(`[${new Date().toISOString()}] Sync completed.`)

      await WIKI.models.storage.query().patch({
        state: {
          status: 'operational',
          message: '',
          log: trimLog(logLines.join('\n')),
          lastAttempt: new Date().toISOString()
        }
      }).where('key', targetKey)
    } else {
      throw new Error('Invalid storage target. Unable to perform sync.')
    }
  } catch (err) {
    WIKI.logger.error(`Syncing with storage target ${targetKey}: [ FAILED ]`)
    WIKI.logger.error(err.message)
    logLines.push(`[${new Date().toISOString()}] ERROR: ${err.message}`)
    if (err.stack) {
      logLines.push(err.stack)
    }
    await WIKI.models.storage.query().patch({
      state: {
        status: 'error',
        message: err.message,
        log: trimLog(logLines.join('\n')),
        lastAttempt: new Date().toISOString()
      }
    }).where('key', targetKey)
  }
}
