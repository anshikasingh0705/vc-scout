// app/api/enrich/route.ts
//
// SERVER-SIDE ONLY — API key never leaves this file.
// Uses Google Gemini (free tier, no credit card needed).
//
// Pipeline:
//   [1] Parallel Fetch+Retry — all pages fire simultaneously
//   [2] maxDuration = 30     — override Vercel's 10s default
//   [3] Rate limiting        — 5 enrichments / 60s per IP

import { NextRequest, NextResponse } from "next/server";
import type { EnrichRequest, EnrichmentResult } from "@/types";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// ─── [3] RATE LIMITER ────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

interface Bucket { tokens: number; windowStart: number; }
const rateLimitStore = new Map<string, Bucket>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const bucket = rateLimitStore.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { tokens: RATE_LIMIT_MAX - 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetInMs: RATE_LIMIT_WINDOW_MS };
  }
  if (bucket.tokens <= 0) {
    return { allowed: false, remaining: 0, resetInMs: RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart) };
  }
  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens, resetInMs: RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart) };
}

function pruneRateLimitStore() {
  const now = Date.now();
  for (const [ip, b] of rateLimitStore.entries()) {
    if (now - b.windowStart > RATE_LIMIT_WINDOW_MS * 2) rateLimitStore.delete(ip);
  }
}

// ─── 1. URL ROUTER ───────────────────────────────────────────────────────────

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

const FETCH_TIMEOUT_MS = 7_000;
const MAX_ATTEMPTS = 3;

async function fetchWithRetry(url: string): Promise<Response | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VCScout/1.0)",
          Accept: "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });
      clearTimeout(timer);
      if (res.ok) return res;
      if (res.status === 404 || res.status === 410) return null;
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt - 1)));
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      console.warn(`[scrape] ${url} attempt ${attempt}:`, isAbort ? "timeout" : String(err));
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
  return null;
}

// ─── 3. HTML → TEXT ──────────────────────────────────────────────────────────

const MAX_CHARS_PER_PAGE = 3_000;
const MAX_TOTAL_CHARS = 10_000;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|section|article|li|h[1-6]|header|footer|nav)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n")
    .trim().slice(0, MAX_CHARS_PER_PAGE);
}

function isBlockedPage(text: string): boolean {
  const l = text.toLowerCase();
  return (
    (l.includes("checking your browser") && l.includes("cloudflare")) ||
    l.includes("just a moment") ||
    l.includes("enable javascript and cookies") ||
    (l.includes("403 forbidden") && text.length < 500)
  );
}

// ─── [1] PARALLEL SCRAPE ─────────────────────────────────────────────────────

interface ScrapeResult {
  scrapedText: string;
  successfulUrls: string[];
  attemptedUrls: string[];
}

async function scrapeCompany(website: string): Promise<ScrapeResult> {
  const pages = buildPageList(website);

  const results = await Promise.allSettled(
    pages.map(async (url) => {
      const res = await fetchWithRetry(url);
      if (!res) return null;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) return null;
      const html = await res.text();
      const text = htmlToText(html);
      if (text.length < 50 || isBlockedPage(text)) return null;
      return { url, text };
    })
  );

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

// ─── 4. GEMINI LLM EXTRACTION ────────────────────────────────────────────────
// Uses Gemini 1.5 Flash — fast, free tier, no credit card required.
// Free limits: 15 requests/min, 1500 requests/day — plenty for this use case.

async function callGemini(
  apiKey: string,
  company: EnrichRequest["company"],
  scrape: ScrapeResult
): Promise<EnrichmentResult> {
  const hasRealContent = scrape.scrapedText.length > 100;

  const prompt = hasRealContent
    ? `You are a VC research analyst. I scraped ${scrape.successfulUrls.length} pages from ${company.name}'s website. Extract a structured enrichment profile from this REAL content.

Company metadata:
- Name: ${company.name}
- Website: ${company.website}
- Sector: ${company.sector}
- Stage: ${company.stage}
- Tags: ${company.tags?.join(", ")}

Real scraped content:
${scrape.scrapedText}

Return ONLY a valid JSON object — no markdown fences, no explanation, just the JSON:
{
  "summary": "2 crisp sentences: what they build based on scraped text, and who buys it",
  "whatTheyDo": [
    "Core product capability from real scraped text",
    "Primary differentiator mentioned on the site",
    "Customer segment or use case mentioned explicitly",
    "GTM motion inferred from site (PLG / sales-led / channel)",
    "Integration or ecosystem angle visible on the site"
  ],
  "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8"],
  "signals": [
    "Careers: number of open roles and departments (from scraped data)",
    "Blog: recency and topic of last post (from scraped data)",
    "Changelog: shipping cadence (from scraped data)",
    "Homepage: social proof, logos, or traction metrics (from scraped data)"
  ],
  "sources": ${JSON.stringify(scrape.successfulUrls)}
}`
    : `You are a VC research analyst. I could not scrape ${company.name}'s website — all pages blocked or unreachable. Use metadata to generate the best profile you can, and flag it clearly in signals.

Company: ${company.name}
Website: ${company.website}
Description: ${company.description}
Sector: ${company.sector}
Stage: ${company.stage}
Tags: ${company.tags?.join(", ")}
Founded: ${company.founded}

Return ONLY a valid JSON object — no markdown fences, no explanation:
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
    "Warning: ${company.website} was not accessible — signals are inferred, not scraped",
    "Stage signal (${company.stage}): typical velocity for this stage",
    "Sector signal (${company.sector}): competitive dynamics inferred",
    "Re-run enrichment when site becomes accessible for real signals"
  ],
  "sources": []
}`;

  // Gemini 1.5 Flash — free tier endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[gemini] ${res.status}:`, errText);
    if (res.status === 400) throw new Error("Invalid Gemini API key. Check GEMINI_API_KEY in .env.local.");
    if (res.status === 429) throw new Error("Gemini rate limit hit. Wait a moment and try again.");
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();

  // Extract text from Gemini response structure
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!rawText) throw new Error("Gemini returned an empty response. Try again.");

  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Gemini sometimes wraps in extra text — try to extract JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse Gemini response as JSON. Try again.");
    parsed = JSON.parse(match[0]);
  }

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

// ─── ROUTE HANDLER ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: GEMINI_API_KEY not set in .env.local" },
      { status: 500 }
    );
  }

  // Rate limit
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  pruneRateLimitStore();
  const { allowed, remaining, resetInMs } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(resetInMs / 1000)}s.` },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
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

  // Scrape
  let scrape: ScrapeResult;
  try {
    scrape = await scrapeCompany(company.website);
    console.log(
      `[enrich] ${company.name}: ${scrape.successfulUrls.length}/${scrape.attemptedUrls.length} pages, ${scrape.scrapedText.length} chars`
    );
  } catch (err) {
    console.error("[enrich] Scrape error:", err);
    scrape = { scrapedText: "", successfulUrls: [], attemptedUrls: [] };
  }

  // LLM extraction
  let result: EnrichmentResult;
  try {
    result = await callGemini(apiKey, company, scrape);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "LLM extraction failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json(
    { result },
    {
      headers: {
        "X-RateLimit-Remaining": String(remaining),
      },
    }
  );
}
