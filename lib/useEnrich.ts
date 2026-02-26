// lib/useEnrich.ts
//
// Client-side hook for company enrichment.
// Calls /api/enrich (server-side) — Anthropic key is never in the browser.
// Handles rate limit 429 responses with a user-friendly countdown message.

import { useState, useCallback } from "react";
import type { Company, EnrichmentResult } from "@/types";

type EnrichState = "idle" | "loading" | "done" | "error";

interface UseEnrichReturn {
  enrich: (company: Company) => Promise<void>;
  state: EnrichState;
  data: EnrichmentResult | null;
  error: string | null;
  reset: () => void;
}

export function useEnrich(
  cachedData?: EnrichmentResult | null,
  onSuccess?: (result: EnrichmentResult) => void
): UseEnrichReturn {
  const [state, setState] = useState<EnrichState>(cachedData ? "done" : "idle");
  const [data, setData] = useState<EnrichmentResult | null>(cachedData ?? null);
  const [error, setError] = useState<string | null>(null);

  const enrich = useCallback(
    async (company: Company) => {
      setState("loading");
      setError(null);

      try {
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company }),
        });

        const json = await res.json();

        if (!res.ok) {
          // Surface the rate limit retry time if present
          if (res.status === 429) {
            const retryAfter = res.headers.get("Retry-After");
            const waitMsg = retryAfter ? ` Try again in ${retryAfter}s.` : "";
            throw new Error(`Rate limit reached.${waitMsg}`);
          }
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }

        const result: EnrichmentResult = { ...json.result, isCached: false };
        setData(result);
        setState("done");
        onSuccess?.(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Enrichment failed.";
        console.error("Enrichment error:", msg);
        setError(msg);
        setState("error");
      }
    },
    [onSuccess]
  );

  const reset = useCallback(() => {
    setState("idle");
    setData(null);
    setError(null);
  }, []);

  return { enrich, state, data, error, reset };
}
