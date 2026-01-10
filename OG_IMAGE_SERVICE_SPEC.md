# OG Image Generation Service (Vercel) — Spec

This document specifies the standalone Open Graph image generation service that WikiJS calls **indirectly** via its `/_og` proxy route. WikiJS must never embed the generator’s base URL or secrets in page HTML.

## Goals

- Return a deterministic social preview image (`image/png`) for a WikiJS page + template.
- Be safe to expose to social crawlers (WikiJS proxy handles public access; the generator is protected by a shared secret header).
- Support aggressive caching via versioned URLs (`v` token).
- Keep latency low (target < 300ms cold, < 50ms hot/cache).

## Non‑Goals

- Not a WikiJS plugin/module; this service is deployed separately.
- Not responsible for controlling crawler access (WikiJS proxy does that).

## High‑Level Architecture

1. A crawler fetches a WikiJS page.
2. WikiJS emits `og:image = https://<wiki-host>/_og/<locale>/<path>.png?v=<version>&t=<template>`.
3. Crawler fetches `/_og/...` from WikiJS.
4. WikiJS `/_og` proxy forwards to this OG service with the shared secret header.
5. OG service returns a PNG.

## Identifier (No Page ID Required)

To avoid dependence on numeric page IDs, the primary identifier for an image is the **normalized page relative path**, including locale:

- `locale`: `en`, `fr`, `pt-br`, etc
- `path`: wiki page path without leading slash (e.g. `home`, `docs/getting-started`)

Canonical form:

- `/<locale>/<path>`

This matches how the WikiJS proxy can emit and forward image requests, and it allows the OG service to fetch page data via GraphQL using `singleByPath`.

## API Contract

### Endpoint (Preferred)

- `GET /_og/:locale/:path.png`

Examples:

- `GET /_og/en/home.png?v=1704752512000&t=default`
- `GET /_og/en/docs/getting-started.png?v=1704752512000&t=docs`

### Endpoint (Legacy, Optional)

- `GET /_og/:pageId.png` (only if you still want to support numeric IDs)

### Query Parameters

- `v` (string, optional but recommended): version token.
  - WikiJS currently uses an `updatedAt` timestamp; any stable “changes when page changes” value is acceptable.
  - When present, the OG service MUST treat the response as immutable for caching.
- `t` (string, optional): template key.
  - Examples: `default`, `docs`, `article`.
  - If missing/unknown, fall back to `default`.

### Headers (Auth)

The request **must** include a secret header from the WikiJS proxy:

- `x-og-secret: <shared-secret>`

Header name may be configured in WikiJS (default is `x-og-secret`). The OG service MUST support configuring the expected header name.

### Responses

**Success**

- `200 OK`
- `Content-Type: image/png`

**Error**

- `401 Unauthorized` if secret missing/invalid
- `400 Bad Request` if the URL is invalid
- `404 Not Found` if the page does not exist (optional: can return a fallback image instead)
- `429 Too Many Requests` if rate limited (optional)
- `500`/`502` for upstream or rendering failures

### Cache Headers

If `v` is present:

- `Cache-Control: public, max-age=31536000, immutable`

If `v` is absent:

- `Cache-Control: public, max-age=60`

The service may also return `ETag` for efficiency, but it’s optional when `immutable` is used with versioned URLs.

## Data Inputs (What to Render)

The OG service needs page metadata. It can obtain it in one of two supported ways:

### Mode A (Recommended): Fetch from WikiJS GraphQL

The OG service calls WikiJS GraphQL to fetch page metadata by `locale` + `path`.

Minimum required fields:

- `title`
- `description` (or summary)
- `path` (for minor styling decisions like “docs”)
- `locale` (optional)
- `updatedAt` (optional)
- global site fields: `site title`, optional `logoUrl`

Suggested GraphQL query (WikiJS schema supports `pages.singleByPath(path, locale)`):

```graphql
query OgPage($path: String!, $locale: String!) {
  pages {
    singleByPath(path: $path, locale: $locale) {
      id
      path
      locale
      title
      description
      updatedAt
      render
      toc
    }
  }
}
```

Notes:

- The OG service should be configured with a dedicated WikiJS token that has permission to read pages.
- The OG service MUST enforce a strict timeout for this fetch (e.g. 2s) and return a fallback image or error if exceeded.

### Mode B: Direct DB Read (Only if co‑located)

The OG service connects to the same DB as WikiJS and reads the `pages` table by `id`.

This is only recommended if you control network boundaries and secrets management; otherwise use GraphQL.

## Template System

Templates are React components rendered by `@vercel/og`.

### Template Keys

- `default`: title + description + site name
- `docs`: compact, high‑contrast, “documentation” look
- `article`: includes author/date if available (optional)

### Layout Requirements

- Output size: **1200×630**
- Safe margins: 64px inset
- Typography: use bundled fonts for deterministic output
- Background: solid or gradient, but must be highly readable in dark-mode feeds

### Fallback Behavior

- If page data is missing or upstream fetch fails, return a generic image:
  - Title: site name
  - Subtitle: “Wiki”
  - Optional: “Page unavailable”

## Vercel Implementation Requirements

### Runtime

Preferred: **Edge Runtime** for low latency.

- Implement as a Vercel route handler (Next.js Route Handler or Vercel Functions).
- Use `@vercel/og` `ImageResponse`.
- Ensure fonts are loaded via `fetch(new URL(..., import.meta.url))` and passed to `ImageResponse` so rendering is deterministic.

If you need Node-only dependencies (e.g. DB driver), switch to Node runtime and accept higher cold start.

### File Layout (Suggested, Next.js)

- `app/_og/[locale]/[...path].png/route.ts` (or `.js`)
- `templates/default.tsx`
- `templates/docs.tsx`
- `templates/article.tsx`
- `lib/wiki.ts` (GraphQL client)
- `assets/fonts/Inter-Regular.ttf` (+ optional bold)

### Concurrency / DDoS Safety

- Enforce the shared secret header (required).
- Add basic rate limiting at the platform edge if needed.
- Avoid per-request heavy work; cache by `(locale, path, v, t)`.

## Caching Strategy (Service Side)

Because WikiJS passes a version token (`v`) that changes when the page changes:

- Cache key MUST be `(locale, path, v, t)`.
- It is acceptable (and recommended) to rely on CDN caching only:
  - With `immutable`, the CDN can keep results for a long time safely.
- Optional: add internal caching (KV/Blob) to reduce render work on cold edges.

## Security

- Secret is never exposed in HTML (WikiJS proxy injects it).
- Secret must be stored as an environment variable in the OG service.
- Service should return `401` quickly for missing/invalid secret.
- Do not log secrets; redact headers in logs.

## Observability

Log per-request (structured):

- `locale`, `path`, `t`, `v` present/absent
- render duration
- upstream fetch duration + status
- cache hit/miss signal (if implemented)

## Compatibility Notes

- Social crawlers frequently require absolute `og:image` URLs. WikiJS already converts `/_og/...` to an absolute URL at render time.
- Some crawlers re-scrape unpredictably. Versioned URLs are mandatory for reliable “update after edit” behavior.

## “Include Text From The Page” vs “Screenshot”

There are two different features that look similar but have different implementations:

### A) Text Excerpts (Still `@vercel/og`)

If you want “some text from the page” in the OG image (e.g. first paragraph, headings, callouts), you do **not** need a screenshot. You can:

1. Fetch the page content via GraphQL (`render` or `content` if authorized).
2. Extract plain text server-side:
   - If you use `render` (HTML), strip tags to text, then truncate.
   - If you use `content` (source), parse markdown frontmatter / markdown and extract headings and a snippet.
3. Render the image with `@vercel/og`.

This stays fast and works well on Vercel Edge.

### B) Real “Screenshot” Previews (Requires Headless Browser)

If you want a true screenshot-like image of the actual rendered page (theme, CSS, layout), `@vercel/og` is not sufficient. Use a headless browser renderer (Playwright/Puppeteer) and screenshot.

Recommended architecture:

- Keep this OG generator service for **text-based** images (`@vercel/og`).
- Add a separate “screenshot service” if you truly need screenshots, because:
  - headless Chromium is heavier (cold starts, memory, sandboxing)
  - it’s better suited to a long-lived container (not Edge)

If you still want screenshots in the OG service:

- Endpoint stays the same: `GET /_og/:locale/:path.png?...`
- The service fetches the full page URL:
  - `pageUrl = https://<wiki-host>/<locale>/<path>`
- Authentication for private pages (choose one):
  - Make OG pages public, or
  - Use a special “crawler token” query param recognized by WikiJS (risky), or
  - Add a dedicated internal-only wiki hostname that the screenshot service can access with session/JWT, or
  - Preferably: have the screenshot service call WikiJS GraphQL to obtain a one-time signed URL/cookie (requires extra WikiJS changes).

Screenshot constraints:

- Force viewport: 1200×630
- Disable animations
- Wait for network idle with a short cap (e.g. 2s)
- Screenshot only the relevant area (clip)
