# VCScout — Deal Intelligence Platform

Thesis-driven VC sourcing with real website scraping + AI enrichment. API key is server-side only.

---

## Quick Start

```bash
npm install
cp .env.example .env.local
# set ANTHROPIC_API_KEY in .env.local
npm run dev
```

---

## Deploy to Vercel

```bash
npx vercel
# add ANTHROPIC_API_KEY as environment variable when prompted
```

---

## Enrichment Pipeline

```
Browser                 Next.js Server (/api/enrich)            Anthropic
  │                            │                                     │
  │  POST { company } ───────► │                                     │
  │                            │                                     │
  │                      [3] Rate limit check (5 req/min/IP)         │
  │                            │                                     │
  │                      1. URL Router                               │
  │                         builds page list:                        │
  │                         /, /about, /blog, /careers...            │
  │                            │                                     │
  │                      [1] Parallel Fetch + Retry                  │
  │                         ALL pages fire simultaneously            │
  │                         each with 3 attempts + backoff           │
  │                         total wait ≈ 7s (not 63s serial)        │
  │                            │                                     │
  │                      3. HTML → Text                              │
  │                         strip tags, bot-page detection           │
  │                         10k char budget                          │
  │                            │                                     │
  │                      4. LLM Extraction ───────────────────────► │
  │                         real content → structured JSON           │
  │                         graceful fallback if all blocked         │
  │                                                                  │
  │  ◄──── { result } ─────────────────────────────────────────────  │
```

### Three production fixes applied

**[1] Parallel fetches** (`Promise.allSettled`)
All 9 candidate pages fire simultaneously. Total scrape time = slowest single
page (~7s) instead of up to 63s serial. Comfortably fits within the 30s function limit.

**[2] `maxDuration = 30`**
Explicitly set on the route handler. Vercel's default is 10s — not enough for
scraping + LLM. This raises the ceiling to 30s without needing a paid plan upgrade.

**[3] In-memory rate limiter**
Token bucket: 5 enrichments per IP per 60s. Returns `429` with `Retry-After`
header when exceeded. Client surfaces the countdown in the error message.
For multi-instance production: swap the in-memory `Map` for
`@upstash/ratelimit` + Redis (one-line change).

### Cloudflare / bot protection
If a site returns a Cloudflare challenge page, `isBlockedPage()` detects it and
skips that URL rather than feeding junk to Claude. The enrichment gracefully falls
back to metadata-only and clearly labels signals as inferred.

---

## Architecture

```
app/api/enrich/route.ts   ← entire server pipeline (scrape + LLM)
lib/useEnrich.ts          ← client hook → calls /api/enrich
lib/useLocalStorage.ts    ← SSR-safe localStorage
lib/data.ts               ← company data, thesis config
types/index.ts            ← shared types incl. ScrapeStats
components/               ← all UI components
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `⌘K` | Command palette |
| `/` | Focus search |
| `j` / `k` | Navigate rows |
| `↵` | Open company |
| `e` | Enrich |
| `f` | Follow / unfollow |
| `n` | Focus notes |
| `b` | Back |
| `?` | Shortcuts |

---

## Security

- `ANTHROPIC_API_KEY` lives in `process.env` — server only, never in client JS
- `.env.local` is gitignored
- Rate limiting prevents API key abuse from exposed endpoint
- All user data (lists, notes, cache) stays in localStorage only
