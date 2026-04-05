const path = require('path')
const pug = require('pug')

describe('page view template', () => {
  test('renders boolean vue bindings with explicit bound values', () => {
    const html = pug.renderFile(path.join(__dirname, '..', 'views', 'page.pug'), {
      basedir: path.join(__dirname, '..', 'views'),
      injectCode: {},
      comments: {
        head: '',
        body: '',
        main: '',
        codeTemplate: false
      },
      config: {
        title: 'Longevipedia',
        host: 'https://longevipedia.net',
        theming: {
          theme: 'longevidence',
          iconset: 'mdi',
          showTags: false
        },
        nav: {
          mode: 'NONE'
        },
        features: {
          featurePageComments: false
        },
        editShortcuts: {},
        conversionCta: {
          frequencyHours: 24
        }
      },
      pageMeta: {
        title: 'Frontier Treatments',
        description: 'Experimental and emerging longevity interventions.',
        image: '',
        url: 'https://longevipedia.net/en/pages/frontier-treatments'
      },
      siteConfig: {
        title: 'Longevipedia',
        theme: 'longevidence',
        lang: 'en'
      },
      langs: [],
      analyticsCode: {
        head: '',
        bodyStart: '',
        bodyEnd: ''
      },
      devMode: false,
      effectivePermissions: {
        comments: {
          read: false
        }
      },
      breadcrumbs: [
        { path: '/', name: 'Home' },
        { path: '/en/pages', name: 'The Library' }
      ],
      page: {
        localeCode: 'en',
        path: 'pages/frontier-treatments',
        title: 'Frontier Treatments',
        description: 'Experimental and emerging longevity interventions.',
        tags: [],
        createdAt: '2026-01-17T18:01:12.771Z',
        updatedAt: '2026-02-13T22:55:26.537Z',
        authorName: 'Administrator',
        authorId: 1,
        editorKey: 'markdown',
        isPublished: true,
        toc: '[]',
        id: 117,
        extra: {},
        render: '<p>Example page</p>'
      },
      sidebar: [],
      pageFilename: 'en/pages/frontier-treatments.md',
      anonViewLimit: {
        limitReached: true,
        remainingViews: 2,
        softPrompt: true,
        warnReached: true,
        ctaEnabled: true,
        ctaVariant: 'default'
      },
      membershipInfo: {
        maxRows: 4,
        tierKey: 'free'
      }
    })

    expect(html).toContain(':limit-reached="true"')
    expect(html).toContain(':soft-prompt="true"')
    expect(html).toContain(':warn-reached="true"')
    expect(html).toContain(':cta-enabled="true"')
    expect(html).not.toContain(':limit-reached ')
    expect(html).not.toContain(':soft-prompt ')
    expect(html).not.toContain(':warn-reached ')
    expect(html).not.toContain(':cta-enabled ')
    expect(html).not.toContain(':limit-reached>')
    expect(html).not.toContain(':soft-prompt>')
    expect(html).not.toContain(':warn-reached>')
    expect(html).not.toContain(':cta-enabled>')
  })
})
