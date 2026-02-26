// app/api/enrich/route.ts
//
// SERVER-SIDE ONLY — Anthropic API key never leaves this file.
//
// Fixes applied:
//   [1] Parallel fetches   — all pages fire simultaneously via Promise.allSettled()
//                            total wait = slowest single page (~8s), not 72s serial
//   [2] maxDuration = 30   — explicitly allow up to 30s on Vercel (overrides 10s default)
//   [3] Rate limiting      — in-memory token bucket: 5 enrichments / 60s per IP
//                            no external dependency needed for this scale
//
// Pipeline:
//   URL Router → Parallel Fetch+Retry → HTML→Text → LLM Extraction → return

import { NextRequest, NextResponse } from "next/server";
import type { EnrichRequest, EnrichmentResult } from "@/types";

// ── [2] Tell Vercel this function may run up to 30 seconds ───────────────────
// Without this, Vercel cuts the function at 10s — way too short for scraping.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// ─── [3] IN-MEMORY RATE LIMITER ───────────────────────────────────────────────
// Token bucket: each IP gets RATE_LIMIT_MAX tokens, refilled every RATE_LIMIT_WINDOW_MS.
// Serverless functions don't share memory across instances, but this still prevents
// a single client from hammering the endpoint within a single cold-start lifetime,
// and is the right pattern to show — swap Map for Redis/Upstash for multi-instance.

const RATE_LIMIT_MAX = 5;           // max enrichments per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 60 second window

interface RateLimitBucket {
  tokens: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const bucket = rateLimitStore.get(ip);

  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window — reset bucket
    rateLimitStore.set(ip, { tokens: RATE_LIMIT_MAX - 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetInMs: RATE_LIMIT_WINDOW_MS };
  }

  if (bucket.tokens <= 0) {
    const resetInMs = RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart);
    return { allowed: false, remaining: 0, resetInMs };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens, resetInMs: RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart) };
}

// Clean up old entries to prevent unbounded Map growth in long-lived instances
function pruneRateLimitStore() {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitStore.entries()) {
    if (now - bucket.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(ip);
    }
  }
}

// ─── 1. URL ROUTER ────────────────────────────────────────────────────────────
// Returns prioritised list of pages to attempt for a given domain.

function buildPageList(website: string): string[] {
  const base = website.replace(/\/$/, "");
  return [
    base,
    `${base}/about`,
    `${base}/about-us`,
    `${base}/product`,
    `${base}/blog`,
    `${base}/careers`,
    `${base}/jobs`,
    `${base}/changelog`,
    `${base}/updates`,
  ];
}

// ─── 2. FETCH WITH RETRY ─────────────────────────────────────────────────────
// Each individual URL gets up to MAX_ATTEMPTS tries with exponential backoff.
// Returns null on permanent failure — caller skips gracefully.

const FETCH_TIMEOUT_MS = 7_000; // keep under 8s so parallel batch finishes in ~8s total
const MAX_ATTEMPTS = 3;

async function fetchWithRetry(url: string): Promise<Response | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VCScout/1.0; +https://vcscout.io/bot)",
          Accept: "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      clearTimeout(timer);

      if (res.ok) return res;

      // Permanent failures — don't retry
      if (res.status === 404 || res.status === 410) return null;

      // Transient failures — backoff and retry
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt - 1)));
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      console.warn(`[scrape] ${url} attempt ${attempt}/${MAX_ATTEMPTS}:`, isAbort ? "timeout" : String(err));
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
  }
  return null;
}

// ─── 3. HTML → PLAIN TEXT ────────────────────────────────────────────────────

const MAX_CHARS_PER_PAGE = 3_000;
const MAX_TOTAL_CHARS = 10_000;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|header|footer|nav)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CHARS_PER_PAGE);
}

// Detect Cloudflare/bot-protection pages — they contain real HTML but no useful content
function isBlockedPage(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes("checking your browser") && lower.includes("cloudflare")) ||
    lower.includes("just a moment") ||
    lower.includes("enable javascript and cookies") ||
    lower.includes("please wait while we verify") ||
    (lower.includes("403 forbidden") && text.length < 500)
  );
}

// ─── [1] PARALLEL SCRAPE PIPELINE ─────────────────────────────────────────────
// Fires all page fetches simultaneously with Promise.allSettled().
// Total wait time = slowest single successful page, not sum of all pages.
// Serial worst case was 9 pages × 8s = 72s. Parallel worst case = 8s.

interface ScrapeResult {
  scrapedText: string;
  successfulUrls: string[];
  attemptedUrls: string[];
}

async function scrapeCompany(website: string): Promise<ScrapeResult> {
  const pages = buildPageList(website);

  // Fire all fetches in parallel
  const results = await Promise.allSettled(
    pages.map(async (url) => {
      const res = await fetchWithRetry(url);
      if (!res) return null;

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) return null;

      const html = await res.text();
      const text = htmlToText(html);

      if (text.length < 50) return null;
      if (isBlockedPage(text)) {
        console.warn(`[scrape] ${url} — bot protection detected, skipping`);
        return null;
      }

      return { url, text };
    })
  );

  // Collect successful results, respecting total char budget
  const chunks: string[] = [];
  const successfulUrls: string[] = [];
  let totalChars = 0;

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) continue;
    if (totalChars >= MAX_TOTAL_CHARS) break;

    const { url, text } = result.value;
    chunks.push(`--- ${url} ---\n${text}`);
    successfulUrls.push(url);
    totalChars += text.length;
  }

  return {
    scrapedText: chunks.join("\n\n").slice(0, MAX_TOTAL_CHARS),
    successfulUrls,
    attemptedUrls: pages,
  };
}

// ─── 4. LLM EXTRACTION ───────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  company: EnrichRequest["company"],
  scrape: ScrapeResult
): Promise<EnrichmentResult> {
  const hasRealContent = scrape.scrapedText.length > 100;

  const prompt = hasRealContent
    ? `You are a VC research analyst. I have scraped the following pages from ${company.name}'s website. Extract a structured enrichment profile from this REAL content.

Company metadata:
- Name: ${company.name}
- Website: ${company.website}
- Sector: ${company.sector}
- Stage: ${company.stage}
- Tags: ${company.tags?.join(", ")}

Real scraped content (${scrape.successfulUrls.length} pages):
${scrape.scrapedText}

Based on the actual scraped content above, return ONLY a valid JSON object (no markdown, no preamble):
{
  "summary": "2 crisp sentences: what they actually build based on the scraped text, and who buys it",
  "whatTheyDo": [
    "Core product capability derived from real scraped text",
    "Primary differentiator mentioned on the site",
    "Customer segment or use case mentioned explicitly",
    "GTM motion inferred from site content (PLG / sales-led / channel)",
    "Integration or ecosystem angle visible on the site"
  ],
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"],
  "signals": [
    "Careers page: number of open roles and departments found (or not found)",
    "Blog: recency of last post and topic found (or not found)",
    "Changelog: shipping cadence found (or not found)",
    "Homepage: customer logos, user count, or traction metrics found (or not found)"
  ],
  "sources": ${JSON.stringify(scrape.successfulUrls)}
}`
    : `You are a VC research analyst. I could not scrape ${company.name}'s website — all pages were blocked or unreachable. Use the metadata below to generate the best enrichment profile you can, and clearly flag this in signals.

Company: ${company.name}
Website: ${company.website}
Description: ${company.description}
Sector: ${company.sector}
Stage: ${company.stage}
Tags: ${company.tags?.join(", ")}
Founded: ${company.founded}

Return ONLY a valid JSON object (no markdown, no preamble):
{
  "summary": "2 crisp sentences based on available metadata only",
  "whatTheyDo": [
    "Core product capability inferred from description",
    "Likely differentiator based on sector and tags",
    "Target customer segment inferred from metadata",
    "GTM motion typical for this stage and sector",
    "Ecosystem angle common in this space"
  ],
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"],
  "signals": [
    "Warning: ${company.website} was not accessible — all signals below are inferred, not scraped",
    "Stage signal (${company.stage}): typical hiring and shipping velocity for this stage",
    "Sector signal (${company.sector}): competitive dynamics and common patterns",
    "Tip: re-run enrichment when site becomes accessible for real scraped signals"
  ],
  "sources": []
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[claude] ${res.status}:`, errText);
    if (res.status === 401) throw new Error("Invalid Anthropic API key.");
    if (res.status === 429) throw new Error("Anthropic rate limit hit. Try again shortly.");
    throw new Error(`Anthropic API error: ${res.status}`);
  }

  const data = await res.json();
  const rawText: string = data.content
    .map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : ""))
    .join("");

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  return {
    ...parsed,
    timestamp: new Date().toISOString(),
    isCached: false,
    scrapeStats: {
      pagesAttempted: scrape.attemptedUrls.length,
      pagesSucceeded: scrape.successfulUrls.length,
      charsScraped: scrape.scrapedText.length,
      hadRealContent: hasRealContent,
    },
  };
}

// ─── ROUTE HANDLER ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // API key guard
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: ANTHROPIC_API_KEY not set." },
      { status: 500 }
    );
  }

  // [3] Rate limiting — get IP from Vercel's forwarded header or fallback
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  pruneRateLimitStore(); // periodic cleanup
  const { allowed, remaining, resetInMs } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(resetInMs / 1000)}s.` },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetInMs / 1000)),
          "Retry-After": String(Math.ceil(resetInMs / 1000)),
        },
      }
    );
  }

  // Parse body
  let body: EnrichRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { company } = body;
  if (!company?.name || !company?.website) {
    return NextResponse.json(
      { error: "Missing required fields: name, website." },
      { status: 400 }
    );
  }

  // [1] Parallel scrape
  let scrape: ScrapeResult;
  try {
    scrape = await scrapeCompany(company.website);
    console.log(
      `[enrich] ${company.name}: ${scrape.successfulUrls.length}/${scrape.attemptedUrls.length} pages, ${scrape.scrapedText.length} chars`
    );
  } catch (err) {
    console.error("[enrich] Scrape pipeline error:", err);
    scrape = { scrapedText: "", successfulUrls: [], attemptedUrls: [] };
  }

  // LLM extraction on real content
  let result: EnrichmentResult;
  try {
    result = await callClaude(apiKey, company, scrape);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "LLM extraction failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json(
    { result },
    {
      headers: {
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(remaining),
      },
    }
  );
}
