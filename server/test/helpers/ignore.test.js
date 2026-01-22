const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const NodeCache = require('node-cache')

const ignoreHelper = require('../../helpers/ignore')

describe('helpers/ignore', () => {
  let tmpDir

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wikijs-ignore-'))
    global.WIKI = {
      cache: new NodeCache(),
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
      }
    }
  })

  afterEach(async () => {
    await fs.remove(tmpDir)
    delete global.WIKI
  })

  it('ignores .wikijsignore itself even when missing', async () => {
    const checker = await ignoreHelper.getIgnoreChecker(tmpDir)
    expect(ignoreHelper.matches(checker, '.wikijsignore')).toBe(true)
    expect(ignoreHelper.matches(checker, 'README.md')).toBe(false)
  })

  it('supports glob patterns and negation', async () => {
    await fs.writeFile(path.join(tmpDir, '.wikijsignore'), [
      '# ignore temp markdown except README',
      'temp/*.md',
      '!temp/README.md',
      '*.tmp',
      '**/*.log'
    ].join('\n'))

    const checker = await ignoreHelper.getIgnoreChecker(tmpDir)

    expect(ignoreHelper.matches(checker, 'temp/a.md')).toBe(true)
    expect(ignoreHelper.matches(checker, 'temp/README.md')).toBe(false)
    expect(ignoreHelper.matches(checker, 'a.tmp')).toBe(true)
    expect(ignoreHelper.matches(checker, 'logs/app.log')).toBe(true)
  })

  it('treats directory patterns as directories (drafts/ ignores drafts/file.md)', async () => {
    await fs.writeFile(path.join(tmpDir, '.wikijsignore'), 'drafts/\n')
    const checker = await ignoreHelper.getIgnoreChecker(tmpDir)

    expect(ignoreHelper.matches(checker, 'drafts')).toBe(true)
    expect(ignoreHelper.matches(checker, 'drafts/file.md')).toBe(true)
  })

  it('normalizes windows-style paths', async () => {
    await fs.writeFile(path.join(tmpDir, '.wikijsignore'), 'drafts/\n')
    expect(await ignoreHelper.shouldIgnore(tmpDir, 'drafts\\file.md')).toBe(true)
  })

  it('caches ignore rules until cleared', async () => {
    const ignorePath = path.join(tmpDir, '.wikijsignore')

    await fs.writeFile(ignorePath, '*.tmp\n')
    const checker1 = await ignoreHelper.getIgnoreChecker(tmpDir)
    expect(ignoreHelper.matches(checker1, 'a.tmp')).toBe(true)
    expect(ignoreHelper.matches(checker1, 'a.log')).toBe(false)

    await fs.writeFile(ignorePath, '*.log\n')
    const checker2 = await ignoreHelper.getIgnoreChecker(tmpDir)
    expect(ignoreHelper.matches(checker2, 'a.tmp')).toBe(true)
    expect(ignoreHelper.matches(checker2, 'a.log')).toBe(false)

    ignoreHelper.clearCache(tmpDir)
    const checker3 = await ignoreHelper.getIgnoreChecker(tmpDir)
    expect(ignoreHelper.matches(checker3, 'a.tmp')).toBe(false)
    expect(ignoreHelper.matches(checker3, 'a.log')).toBe(true)
  })

  it('warns on dangerous ignore-all patterns', async () => {
    await fs.writeFile(path.join(tmpDir, '.wikijsignore'), '*\n')
    await ignoreHelper.getIgnoreChecker(tmpDir)
    expect(global.WIKI.logger.warn).toHaveBeenCalled()
  })
})
