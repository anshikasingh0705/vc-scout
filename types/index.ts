// types/index.ts

export interface Company {
  id: string;
  name: string;
  website: string;
  stage: "Pre-Seed" | "Seed" | "Series A" | "Series B";
  sector: string;
  tags: string[];
  hq: string;
  founded: number;
  employees: string;
  score: number;
  description: string;
}

export interface TimelineEvent {
  dt: string;
  type: "product" | "funding" | "hire" | "press" | "customer";
  text: string;
}

export interface ScrapeStats {
  pagesAttempted: number;
  pagesSucceeded: number;
  charsScraped: number;
  hadRealContent: boolean;
}

export interface EnrichmentResult {
  summary: string;
  whatTheyDo: string[];
  keywords: string[];
  signals: string[];
  sources: string[];
  timestamp: string;
  isCached: boolean;
  // Populated by the server scrape pipeline — shows what was actually fetched
  scrapeStats?: ScrapeStats;
}

export interface SavedList {
  id: string;
  name: string;
  description: string;
  companies: string[];
  created: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  stage: string;
  sector: string;
  created: number;
  runs: number;
}

// The request body shape for /api/enrich
export interface EnrichRequest {
  company: Company;
}

// The response shape from /api/enrich
export interface EnrichResponse {
  result?: EnrichmentResult;
  error?: string;
}
