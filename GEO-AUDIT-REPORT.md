# GEO Audit Report — longevipedia.net
**Date:** 2026-03-20
**Business Type:** Publisher / Longevity Science Knowledge Base
**Technology:** Wiki.js (Vue.js SPA, client-side rendering)
**Languages:** English · Spanish · Chinese (Simplified)
**Pages Indexed:** 677–800+

---

## Composite GEO Score: 25/100 — Critical

| Category | Weight | Score | Weighted |
|---|---|---|---|
| AI Citability & Visibility | 25% | 21/100 | 5.25 |
| Brand Authority Signals | 20% | 12/100 | 2.40 |
| Content Quality & E-E-A-T | 20% | 40/100 | 8.00 |
| Technical Foundations | 15% | 42/100 | 6.30 |
| Structured Data | 10% | 5/100 | 0.50 |
| Platform Optimization | 10% | 28/100 | 2.80 |
| **TOTAL** | **100%** | | **25/100** |

> **The core paradox:** Longevipedia contains well-structured, evidence-based content on precisely the topics AI systems are most frequently asked about — yet has constructed nearly every possible barrier between that content and AI visibility. The gap between actual content quality and measurable AI-accessible quality is almost entirely architectural and policy-driven, not editorial.

---

## Score Dashboard

```
AI Citability & Visibility  ████░░░░░░░░░░░░░░░░  21/100  CRITICAL
Brand Authority Signals     ██░░░░░░░░░░░░░░░░░░  12/100  CRITICAL
Content Quality / E-E-A-T   ████████░░░░░░░░░░░░  40/100  POOR
Technical Foundations       ████████░░░░░░░░░░░░  42/100  POOR
Structured Data             █░░░░░░░░░░░░░░░░░░░   5/100  CRITICAL
Platform Optimization       █████░░░░░░░░░░░░░░░  28/100  CRITICAL

Google AI Overviews         ██████░░░░░░░░░░░░░░  32/100  CRITICAL
ChatGPT Web Search          ███░░░░░░░░░░░░░░░░░  18/100  CRITICAL
Perplexity AI               ██████░░░░░░░░░░░░░░  30/100  CRITICAL
Google Gemini               ███████░░░░░░░░░░░░░  35/100  POOR
Bing Copilot                █████░░░░░░░░░░░░░░░  25/100  CRITICAL
```

---

## The Three Root Causes

Everything else in this report flows from three compounding structural failures:

### 1. JavaScript-Only Rendering (CSR)
Wiki.js serves a blank `<div id="app">` to crawlers. Every AI platform except Google (which executes JS with delay and crawl budget cost) receives **zero content**. 800+ pages of longevity science are invisible to PerplexityBot, OAI-SearchBot, BingBot, and every other non-Google AI crawler. Title tags are server-rendered but all body text, headings, meta descriptions, schema, hreflang, and canonical tags are injected by Vue.js after page load.

### 2. AI Crawler Blocking in robots.txt
The robots.txt explicitly blocks 9 major AI crawlers with `Disallow: /`:

| Blocked Crawler | Platform Affected |
|---|---|
| GPTBot | ChatGPT training + web search |
| ClaudeBot | Anthropic Claude |
| Google-Extended | Gemini training + AI Overviews data |
| Amazonbot | Amazon/Alexa AI |
| Applebot-Extended | Apple Intelligence |
| Bytespider | TikTok/ByteDance AI |
| CCBot | Common Crawl (feeds Llama, Mistral, many LLMs) |
| meta-externalagent | Meta AI |
| CloudflareBrowserRenderingCrawler | Cloudflare AI features |

The wildcard `Content-Signal: ai-train=no` correctly signals training restrictions. But specific `Disallow: /` directives also block **real-time retrieval and RAG-based citation** — a completely separate use case the site likely does not intend to block.

### 3. Zero Structured Data
No JSON-LD, Microdata, or RDFa was found on any page. Critically, **all data needed for full schema generation already exists server-side** in the Pug template context (`page.title`, `page.description`, `page.createdAt`, `page.updatedAt`, `page.authorName`, `page.localeCode`, `breadcrumbs[]`). This is a 20-30 line template change, not a data problem.

---

## Detailed Findings

### AI Citability & Visibility — 21/100

**llms.txt:** Not found (HTTP 404 at `/llms.txt`)

**AI Crawler Access:**
- PerplexityBot: ✅ Not blocked (but gets blank page due to CSR)
- OAI-SearchBot: ✅ Not explicitly blocked
- ChatGPT-User: ✅ Not explicitly blocked
- GPTBot: ❌ Explicitly blocked
- ClaudeBot: ❌ Explicitly blocked
- Google-Extended: ❌ Explicitly blocked

**Citability scoring** (from metadata fragments, since content is not crawlable):
- Cellular Senescence description: 46/100 — moderate, definition-quality, no statistics
- Epigenetic Alterations description: 42/100 — citation-unlikely
- Hallmarks of Aging: 0/100 effective — no static content reaches crawlers
- Homepage: 12/100 — tagline only, no answer content

**Operational citability score after CSR penalty: 28/100**
**Underlying content potential (if rendered): 65–80/100**

---

### Brand Authority Signals — 12/100

| Platform | Status | Notes |
|---|---|---|
| Wikipedia | ❌ Absent | No article, no Wikipedia API hit. Single strongest missing signal. |
| Wikidata | ❌ Absent | No Q-number found |
| Reddit | ❌ Unconfirmed | No verified presence in r/longevity, r/biohacking, r/nootropics |
| YouTube | ❌ Unconfirmed | No confirmed channel |
| LinkedIn | ⚠️ Minimal | Company page exists: 22 followers, 1 employee, founded 2021 |
| Industry citations | ❌ Minimal | No Examine.com, Huberman Lab, Fight Aging references confirmed |

---

### Content Quality & E-E-A-T — 40/100

| Dimension | Score | Key Finding |
|---|---|---|
| Experience | 7/25 | LongeviData research widget is a strong differentiator but invisible to crawlers |
| Expertise | 9/25 | Author system exists in Wiki.js but no public author profiles or credentials |
| Authoritativeness | 12/25 | Strong topical breadth (13 biology pages, 44 peptides, 35+ supplements, 60+ biohacking) |
| Trustworthiness | 14/25 | HTTPS ✅, Medical disclaimer ✅, Privacy Policy ✅; no editorial standards page |

**Positive signals:**
- `<research-snapshot>`, `<longevidata-table>`, `<longevidence-score>` components aggregate GRADE-rated study data — genuine editorial infrastructure
- `<footnote>` system implies actual citations are embedded in content
- Content updated as recently as February 13, 2026
- Three-language coverage (EN/ES/ZH)
- Correct YMYL disclaimer language

**Gaps:**
- No public author profiles or credential pages in sitemap
- No editorial standards/policy page
- Content license: "All Rights Reserved" (reduces citation potential)
- Physical address / organizational identity not confirmed
- Guide section is thin (only 2 guide pages for an 800-page wiki)

---

### Technical Foundations — 42/100

| Check | Status | Severity |
|---|---|---|
| HTTPS | ✅ Confirmed | — |
| 404 handling | ✅ Correct HTTP 404 | — |
| URL structure | ✅ Clean `/{locale}/{category}/{slug}` | — |
| Sitemap exists | ✅ `/sitemap.xml` (683 URLs) | — |
| devMode=true in production | ❌ CRITICAL | Disables Vue optimizations, degrades LCP/INP |
| Server-side rendering | ❌ None detected | CRITICAL |
| Meta tags in static HTML | ❌ JS-injected only | HIGH |
| Canonical tags in static HTML | ❌ JS-injected only | HIGH |
| hreflang in static HTML | ❌ JS-injected only | HIGH |
| Sitemap in robots.txt | ❌ Not referenced | HIGH |
| Sitemap coverage gap | ⚠️ 683 vs 800+ pages | MEDIUM |
| `/en/AGENTS` in sitemap | ⚠️ System page exposed | LOW |
| Core Web Vitals (LCP) | ⚠️ HIGH risk (full CSR) | MEDIUM |
| Security headers | ⚠️ Unconfirmed (Cloudflare likely covers) | LOW |

---

### Structured Data — 5/100

**Zero schema found on any page.** 5 points awarded only because no deprecated or harmful schemas are present.

**Missing schemas (by priority):**
1. `Organization` + `sameAs` links — homepage
2. `Article` / `MedicalWebPage` — all content pages
3. `BreadcrumbList` — all content pages (breadcrumbs already built server-side!)
4. `WebSite` + `SearchAction` — homepage
5. `Person` (author) — author profile pages
6. `speakable` — top biology/supplement articles

**Key opportunity:** The `breadcrumbs` array and all article metadata are already in scope when `page.pug` renders. No new API calls needed. Implementation is a template change only.

**Files to modify:**
- `server/views/page.pug` → Add Article + BreadcrumbList JSON-LD
- `server/views/master.pug` → Add WebSite + Organization JSON-LD
- `server/views/welcome.pug` → Add homepage Organization schema

---

### Platform Optimization — 28/100

| Platform | Score | Primary Blocker |
|---|---|---|
| Google AI Overviews | 32/100 | No FAQPage schema, no SSR-rendered "answer target" paragraphs |
| ChatGPT Web Search | 18/100 | GPTBot blocked, no Wikipedia/Wikidata entity, JS rendering |
| Perplexity AI | 30/100 | CSR (PerplexityBot gets blank page), no llms.txt |
| Google Gemini | 35/100 | Google-Extended blocked, no YouTube, no Knowledge Graph entity |
| Bing Copilot | 25/100 | No Bing Webmaster Tools, no IndexNow, JS rendering barrier |

**Strongest platform:** Google Gemini (Googlebot is allowed + executes JS)
**Weakest platform:** ChatGPT Web Search (GPTBot blocked + no entity recognition)

---

## Prioritized Action Plan

### Quick Wins (< 1 day effort, immediate impact)

| # | Action | Impact | Effort |
|---|---|---|---|
| QW-1 | **Add `Sitemap:` directive to robots.txt** | Crawl discovery | 5 min |
| QW-2 | **Allow GPTBot and OAI-SearchBot in robots.txt** | ChatGPT visibility | 15 min |
| QW-3 | **Allow Google-Extended in robots.txt** | Gemini visibility | 5 min |
| QW-4 | **Disable `devMode=true` in production** | LCP/INP performance | 15 min |
| QW-5 | **Create `/llms.txt`** | Perplexity + AI crawlers | 1 hour |
| QW-6 | **Register in Bing Webmaster Tools + submit sitemap** | Bing Copilot | 2 hours |

**Revised robots.txt structure:**
```
User-agent: *
Content-Signal: search=yes, ai-train=no
Allow: /

# Allow AI retrieval (not training — signal above covers training)
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Google-Extended
Allow: /

# Keep training-specific blocks for these (or remove entirely)
User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: https://longevipedia.net/sitemap.xml
```

---

### Medium-Term (1–2 weeks, high impact)

| # | Action | Impact | Effort |
|---|---|---|---|
| MT-1 | **Add JSON-LD schema to `page.pug`** (Article + BreadcrumbList) | Schema 0→60+ | 2–4 hours |
| MT-2 | **Add Organization + WebSite schema to `master.pug`** | Entity recognition | 1 hour |
| MT-3 | **Inject meta description + OG tags server-side** from `pageMeta` | All platforms | 2 hours |
| MT-4 | **Inject canonical + hreflang tags server-side** | Duplicate content fix | 2 hours |
| MT-5 | **Create `/llms-full.txt`** with top 30 articles as plaintext | Perplexity + RAG | 4 hours |
| MT-6 | **Restructure key H2s to question format** on top 20 biology pages | Google AIO | Editorial |
| MT-7 | **Create author profile pages** with credentials | E-E-A-T + trust | Editorial |
| MT-8 | **Publish Editorial Standards page** | YMYL compliance | 2 hours |

**Pug template snippet for `page.pug` (MT-1):**
```pug
- const siteBase = 'https://longevipedia.net'
- const pageUrl = siteBase + '/' + page.localeCode + '/' + page.path
- const articleSchema = { '@context': 'https://schema.org', '@type': 'MedicalWebPage', name: page.title, headline: page.title, description: page.description || '', url: pageUrl, datePublished: page.createdAt, dateModified: page.updatedAt, inLanguage: page.localeCode, author: { '@type': 'Person', name: page.authorName }, publisher: { '@type': 'Organization', name: 'Longevipedia', url: siteBase, logo: { '@type': 'ImageObject', url: siteBase + '/images/longevipedia_logo_image_transparent.png' } }, mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl }, speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', '.wiki-content p:first-of-type'] } }
- const breadcrumbSchema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: i === 0 ? siteBase : siteBase + b.path })) }
script(type='application/ld+json') !{JSON.stringify(articleSchema)}
script(type='application/ld+json') !{JSON.stringify(breadcrumbSchema)}
```

---

### Strategic (1–3 months, structural improvements)

| # | Action | Impact | Effort |
|---|---|---|---|
| ST-1 | **Implement SSR or prerendering for article pages** | All platforms +40pts | HIGH |
| ST-2 | **Create Wikidata entity for Longevipedia** | ChatGPT + Gemini entity recognition | MEDIUM |
| ST-3 | **Build Wikipedia presence** (third-party citations first) | Brand authority | HIGH |
| ST-4 | **Launch YouTube channel** (longevity article summaries) | Gemini + brand | MEDIUM |
| ST-5 | **Engage r/longevity, r/biohacking communities** | Perplexity community validation | MEDIUM |
| ST-6 | **Change content license to CC BY 4.0** | Citation potential, third-party links | LOW |
| ST-7 | **Pursue editorial citations** (Examine.com, Fight Aging, Lifespan.io) | Brand authority | HIGH |
| ST-8 | **Create LinkedIn company page with full profile** | Bing/Gemini ecosystem | LOW |
| ST-9 | **Implement IndexNow API** for real-time Bing notification | Bing Copilot | MEDIUM |
| ST-10 | **Server-render LongeviData statistics** as static HTML fallback | E-E-A-T + trust | MEDIUM |

**SSR options for Wiki.js:**
- Cloudflare Worker prerendering (fastest to deploy, intercepts bot user-agents)
- Rendertron / Prerender.io proxy layer
- Migrate to Nuxt.js-based wiki with native SSR
- Wiki.js custom renderer extension

---

## Projected Score Impact

| Action Set | Estimated GEO Score | Timeline |
|---|---|---|
| Current state | 25/100 | Now |
| Quick Wins only (QW-1 to QW-6) | ~35/100 | Day 1 |
| + Medium-Term (MT-1 to MT-8) | ~52/100 | Week 2 |
| + SSR implementation (ST-1) | ~68/100 | Month 1–2 |
| + Full strategic plan | ~78/100 | Month 3+ |

> The single most leveraged action is SSR (+15-20 pts alone). The second most leveraged is the robots.txt edit (+8 pts, 15 minutes of work).

---

## Key Strengths to Build On

1. **Content scope is excellent** — 13 hallmarks of aging pages, 44 peptides, 35+ supplements, 60+ biohacking pages. This is exactly what AI models are asked about.
2. **LongeviData infrastructure** — proprietary GRADE-rated research database is a genuine E-E-A-T differentiator that no other longevity wiki has.
3. **Multi-language presence** (EN/ES/ZH) — rare for this niche, high potential for non-English AI search.
4. **Fresh content** — bulk updated February 2026, very recent.
5. **Clean URL structure** — `/{locale}/{category}/{slug}` is semantically clear and AI-friendly once content is rendered.
6. **Server data is complete** — all metadata needed for schema and meta tags already exists server-side. No data engineering required.

---

## Summary

Longevipedia is a high-potential longevity science publisher that has inadvertently made itself invisible to the AI search ecosystem it should be dominating. The content investment is real. The technical barriers are self-imposed and reversible.

**Three changes would move the score from 25 to ~55 in under a week:**
1. Edit robots.txt to allow GPTBot + Google-Extended (15 minutes)
2. Add JSON-LD schema to `page.pug` using existing server-side data (2–4 hours)
3. Create `/llms.txt` (1 hour)

**One change would move the score from 55 to ~70:**
4. Implement SSR or a prerendering proxy (days to weeks depending on approach)

---

*Report generated by GEO Audit Tool · longevipedia.net · 2026-03-20*
