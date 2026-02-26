"use client";
// components/CompanyProfile.tsx
// Key point: enrichment calls /api/enrich (server-side), never Anthropic directly.

import { useState, useEffect, useRef } from "react";
import type { Company, SavedList, EnrichmentResult } from "@/types";
import { useEnrich } from "@/lib/useEnrich";
import { COMPANIES, TIMELINES, defaultTimeline, isThesisMatch, scoreColor, stageColor, THESIS } from "@/lib/data";

interface Props {
  company: Company;
  onBack: () => void;
  lists: SavedList[];
  addToList: (lid: string, ids: string[]) => void;
  notes: Record<string, string>;
  setNotes: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  following: string[];
  toggleFollow: (id: string) => void;
  enrichCache: Record<string, EnrichmentResult>;
  setEnrichCache: (fn: (prev: Record<string, EnrichmentResult>) => Record<string, EnrichmentResult>) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}

export function CompanyProfile({
  company: c, onBack, lists, addToList, notes, setNotes,
  following, toggleFollow, enrichCache, setEnrichCache, toast,
}: Props) {
  const [showListModal, setShowListModal] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [note, setNote] = useState(notes[c.id] || "");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const isFollowing = following.includes(c.id);
  const tl = TIMELINES[c.id] ?? defaultTimeline(c);

  const TYPE_META: Record<string, { color: string; icon: string }> = {
    product:  { color: "#f59e0b", icon: "P" },
    funding:  { color: "#10b981", icon: "$" },
    hire:     { color: "#8b5cf6", icon: "H" },
    press:    { color: "#3b82f6", icon: "N" },
    customer: { color: "#f97316", icon: "C" },
  };

  // useEnrich calls /api/enrich — key is server-side only
  const { enrich, state: eState, data: eData, error: eError, reset: resetEnrich } = useEnrich(
    enrichCache[c.id] ?? null,
    (result) => {
      // Cache the result in localStorage when enrichment completes
      setEnrichCache(ec => ({ ...ec, [c.id]: { ...result, isCached: true } }));
      toast("Enrichment complete", "success");
    }
  );

  // Keyboard shortcuts for profile page
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA") return;
      if (e.key === "b") onBack();
      if (e.key === "e" && eState === "idle") enrich(c);
      if (e.key === "f") {
        toggleFollow(c.id);
        toast(following.includes(c.id) ? "Unfollowed" : "Now following", "success");
      }
      if (e.key === "n") {
        noteRef.current?.focus();
        noteRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [eState, c.id, following]);

  const exportCompany = (fmt: "json" | "csv") => {
    const payload = { ...c, notes: note, enrichment: eData, timeline: tl };
    const content = fmt === "json"
      ? JSON.stringify(payload, null, 2)
      : Object.entries(c).map(([k, v]) => `"${k}","${Array.isArray(v) ? v.join("|") : v}"`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: fmt === "json" ? "application/json" : "text/csv" }));
    a.download = `${c.name.toLowerCase().replace(/\s+/g, "-")}.${fmt}`;
    a.click();
    toast(`Exported as ${fmt.toUpperCase()}`, "success");
    setShowExport(false);
  };

  const scoreBreakdown = [
    { label: "Thesis Alignment",  val: Math.round(c.score * 0.35) },
    { label: "Stage Fit",         val: THESIS.stages.includes(c.stage) ? 26 : 13 },
    { label: "Sector Signal",     val: Math.round(c.score * 0.22) },
    { label: "Team & Traction",   val: Math.round(c.score * 0.15) },
  ];

  const similar = COMPANIES.filter(x => x.id !== c.id && x.sector === c.sector).slice(0, 3);

  const sc = scoreColor(c.score);
  const stc = stageColor(c.stage);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text2)", fontSize: 12, fontWeight: 500, cursor: "pointer", marginBottom: 13, background: "none", border: "none", padding: "3px 0", fontFamily: "var(--font)" }}
      >
        &larr; Companies <span style={{ color: "var(--text3)" }}>/ {c.name}</span>
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 14 }}>
        {/* ── LEFT COLUMN ── */}
        <div>
          {/* Header */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, padding: 18, display: "flex", gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "var(--gold)" }}>
              {c.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{c.name}</div>
                <span style={{ padding: "3px 8px", borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)", background: `${stc}20`, color: stc, border: `1px solid ${stc}44`, flexShrink: 0, marginTop: 4 }}>{c.stage}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--mono)" }}>📍 {c.hq}</span>
                <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--mono)" }}>👥 {c.employees}</span>
                <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--mono)" }}>🗓 {c.founded}</span>
                <a href={c.website} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--gold)" }}>
                  ↗ {c.website.replace("https://", "")}
                </a>
              </div>
              <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7, marginTop: 9 }}>{c.description}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 13, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={() => enrich(c)}
                  disabled={eState === "loading"}
                  style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "var(--gold)", color: "#000", border: "none", cursor: eState === "loading" ? "not-allowed" : "pointer", opacity: eState === "loading" ? 0.7 : 1, fontFamily: "var(--font)", display: "inline-flex", alignItems: "center", gap: 5 }}
                  title="Press e"
                >
                  {eState === "loading" ? "Enriching..." : eData ? "Re-enrich" : "✦ Enrich"}
                </button>
                <button
                  onClick={() => { toggleFollow(c.id); toast(isFollowing ? "Unfollowed" : "Now following", "success"); }}
                  style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: isFollowing ? "rgba(16,185,129,0.1)" : "none", color: isFollowing ? "var(--green)" : "var(--text2)", border: `1px solid ${isFollowing ? "rgba(16,185,129,0.25)" : "var(--rim)"}`, cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.13s" }}
                  title="Press f"
                >
                  {isFollowing ? "✓ Following" : "+ Follow"}
                </button>
                <button
                  onClick={() => setShowListModal(true)}
                  style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "none", color: "var(--text2)", border: "1px solid var(--rim)", cursor: "pointer", fontFamily: "var(--font)" }}
                >
                  ▤ Save to list
                </button>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowExport(s => !s)}
                    style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "none", color: "var(--text2)", border: "1px solid var(--rim)", cursor: "pointer", fontFamily: "var(--font)" }}
                  >
                    ↓ Export
                  </button>
                  {showExport && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--bg2)", border: "1px solid var(--rim2)", borderRadius: 8, overflow: "hidden", zIndex: 50, minWidth: 110, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                      {(["json", "csv"] as const).map(f => (
                        <button key={f} onClick={() => exportCompany(f)} style={{ display: "flex", width: "100%", padding: "7px 12px", fontSize: 11, color: "var(--text2)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)" }}>
                          ↓ {f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 3, flexWrap: "wrap", alignSelf: "center" }}>
                  {c.tags.map(t => (
                    <span key={t} style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--rim)", fontFamily: "var(--mono)" }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ENRICHMENT CARD */}
          <Card title="Live Enrichment" extra={
            eData && eState === "done"
              ? <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                  {eData.scrapeStats && (
                    <span style={{ fontSize: 9, fontFamily: "var(--mono)", padding: "1px 6px", borderRadius: 3,
                      background: eData.scrapeStats.hadRealContent ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)",
                      color: eData.scrapeStats.hadRealContent ? "var(--blue, #3b82f6)" : "var(--gold)",
                      border: `1px solid ${eData.scrapeStats.hadRealContent ? "rgba(59,130,246,0.25)" : "rgba(245,158,11,0.25)"}` }}>
                      {eData.scrapeStats.hadRealContent
                        ? `scraped ${eData.scrapeStats.pagesSucceeded}p · ${(eData.scrapeStats.charsScraped/1000).toFixed(1)}k chars`
                        : "inferred (site blocked)"}
                    </span>
                  )}
                  <span style={{ fontSize: 9, fontFamily: "var(--mono)", padding: "1px 6px", borderRadius: 3, background: "rgba(16,185,129,0.1)", color: "var(--green)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    {eData.isCached ? "cached" : "fresh"} · {new Date(eData.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              : null
          }>
            {eState === "idle" && (
              <div style={{ textAlign: "center", padding: "24px 20px" }}>
                <div style={{ fontSize: 24, opacity: 0.35, marginBottom: 8 }}>◈</div>
                <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500, marginBottom: 4 }}>No enrichment data yet</div>
                <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                  Click ✦ Enrich above or press <Kbd>e</Kbd>
                </div>
              </div>
            )}
            {eState === "loading" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[52, 13, 13, 13].map((h, i) => <Skel key={i} height={h} width={i === 0 ? "100%" : `${[100,72,88,61][i]}%`} />)}
                <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                  {[70, 55, 85, 65, 75].map((w, i) => <Skel key={i} height={20} width={w} />)}
                </div>
              </div>
            )}
            {eState === "error" && (
              <div style={{ padding: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, fontSize: 12, color: "var(--red)" }}>
                {eError || "Enrichment failed."}
                <br />
                <button onClick={resetEnrich} style={{ marginTop: 8, padding: "3px 9px", background: "none", border: "1px solid var(--rim)", borderRadius: 6, fontSize: 10, color: "var(--text2)", cursor: "pointer", fontFamily: "var(--font)" }}>
                  Retry
                </button>
              </div>
            )}
            {eState === "done" && eData && (
              <div>
                <ESec>Summary</ESec>
                <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.7, padding: "10px 12px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 6, marginBottom: 12 }}>
                  {eData.summary}
                </div>
                <ESec>What they do</ESec>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                  {eData.whatTheyDo?.map((b, i) => (
                    <li key={i} style={{ display: "flex", gap: 7, fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
                      <span style={{ color: "var(--gold)", flexShrink: 0, fontFamily: "var(--mono)" }}>-&gt;</span>
                      {b}
                    </li>
                  ))}
                </ul>
                <ESec>Keywords</ESec>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                  {eData.keywords?.map(k => (
                    <span key={k} style={{ padding: "2px 8px", borderRadius: 3, fontSize: 9, fontFamily: "var(--mono)", background: "rgba(139,92,246,0.1)", color: "#c084fc", border: "1px solid rgba(139,92,246,0.2)" }}>{k}</span>
                  ))}
                </div>
                <ESec>Derived signals</ESec>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {eData.signals?.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 11, color: "var(--text2)", lineHeight: 1.5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", flexShrink: 0, marginTop: 4, display: "block" }} />
                      {s}
                    </div>
                  ))}
                </div>
                <ESec>Sources scraped</ESec>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {eData.sources?.map((s, i) => (
                    <div key={i} style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--text3)", display: "flex", gap: 5 }}>
                      <span style={{ color: "var(--gold)" }}>↗</span>
                      <a href={s} target="_blank" rel="noreferrer">{s}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* SIGNALS TIMELINE */}
          <Card title="Signals Timeline">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {tl.map((item, i) => {
                const meta = TYPE_META[item.type] ?? { color: "#6b7280", icon: "·" };
                return (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", position: "relative" }}>
                    {i < tl.length - 1 && (
                      <div style={{ position: "absolute", left: 8, top: 23, bottom: -7, width: 1, background: "var(--rim)" }} />
                    )}
                    <div style={{ width: 17, height: 17, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, flexShrink: 0, zIndex: 1, marginTop: 1, background: `${meta.color}18`, border: `1px solid ${meta.color}44`, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>{item.text}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>
                          {new Date(item.dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span style={{ fontSize: 9, fontFamily: "var(--mono)", padding: "1px 5px", borderRadius: 3, background: `${meta.color}14`, color: meta.color, border: `1px solid ${meta.color}28` }}>
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* NOTES */}
          <Card title="Notes" extra={<span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--mono)" }}>press <Kbd>n</Kbd> to focus</span>}>
            <textarea
              ref={noteRef}
              style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--rim)", color: "var(--text)", fontSize: 11, fontFamily: "var(--mono)", padding: 9, borderRadius: 6, resize: "vertical", minHeight: 80, lineHeight: 1.65, outline: "none" }}
              placeholder="Deal context, red flags, meeting notes, next steps..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{note.length} chars</span>
              <button
                onClick={() => { setNotes(n => ({ ...n, [c.id]: note })); toast("Note saved", "success"); }}
                style={{ padding: "3px 9px", background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}
              >
                Save
              </button>
            </div>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {/* Score */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "var(--mono)", marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold)", display: "block" }} />
              Thesis Score
            </div>
            <div style={{ fontSize: 50, fontWeight: 800, fontFamily: "var(--mono)", letterSpacing: -2, textAlign: "center", lineHeight: 1, color: sc }}>{c.score}</div>
            <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--mono)", textAlign: "center", marginTop: 2 }}>/ 100</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
              {scoreBreakdown.map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11 }}>
                  <span style={{ color: "var(--text2)", flex: 1 }}>{r.label}</span>
                  <div style={{ flex: 1, height: 2, background: "var(--bg3)", borderRadius: 1, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 1, background: sc, width: `${Math.min(100, (r.val / 35) * 100)}%` }} />
                  </div>
                  <span style={{ color: "var(--text)", fontFamily: "var(--mono)", minWidth: 22, textAlign: "right" }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Thesis Fit */}
          <Card title="Thesis Fit">
            {isThesisMatch(c)
              ? <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, fontSize: 11, color: "var(--green)", fontWeight: 600 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", animation: "blink 2s ease-in-out infinite", display: "block" }} />
                  Strong match
                </div>
              : <div style={{ padding: "8px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 6, fontSize: 11, color: "var(--red)" }}>
                  Partial — {!THESIS.stages.includes(c.stage) ? "stage outside target" : "score below threshold"}
                </div>
            }
            <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.7, marginTop: 9 }}>
              <span style={{ color: "var(--text3)" }}>Stage </span>{THESIS.stages.includes(c.stage) ? "✓ in range" : "✗ out of range"} ·{" "}
              <span style={{ color: "var(--text3)" }}>Score </span>{c.score >= THESIS.minScore ? `✓ ≥${THESIS.minScore}` : `✗ below ${THESIS.minScore}`} ·{" "}
              <span style={{ color: "var(--text3)" }}>Sector </span>{THESIS.keywords.some(k => c.sector.toLowerCase().includes(k.toLowerCase())) ? "✓ keyword match" : "~ adjacent"}
            </div>
          </Card>

          {/* Details */}
          <Card title="Company Details">
            {[["Sector", c.sector],["HQ", c.hq],["Founded", String(c.founded)],["Team", c.employees]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, padding: "5px 0", borderBottom: "1px solid var(--rim)" }}>
                <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 10 }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, padding: "5px 0" }}>
              <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 10 }}>Website</span>
              <a href={c.website} target="_blank" rel="noreferrer" style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gold)" }}>
                {c.website.replace("https://", "")}
              </a>
            </div>
          </Card>

          {/* Similar */}
          {similar.length > 0 && (
            <Card title="Similar Companies">
              {similar.map(x => (
                <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--rim)" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: stageColor(x.stage), background: `${stageColor(x.stage)}15`, border: `1px solid ${stageColor(x.stage)}44` }}>
                    {x.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{x.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{x.stage}</div>
                  </div>
                  <span style={{ color: scoreColor(x.score), fontFamily: "var(--mono)", fontWeight: 600, fontSize: 12 }}>{x.score}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* Save to list modal */}
      {showListModal && (
        <Overlay onClose={() => setShowListModal(false)} title="Save to list">
          {lists.length === 0
            ? <div style={{ fontSize: 12, color: "var(--text2)" }}>No lists yet. Create one in the Lists tab.</div>
            : lists.map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--rim)" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{l.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{l.companies.length} companies</div>
                </div>
                <button onClick={() => { addToList(l.id, [c.id]); setShowListModal(false); toast(`Saved to "${l.name}"`, "success"); }}
                  style={{ padding: "3px 9px", background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>
                  Save
                </button>
              </div>
            ))
          }
        </Overlay>
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────

function Card({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, padding: 14, marginTop: 12 }}>
      <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "var(--mono)", marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--gold)", display: "block", flexShrink: 0 }} />
        {title}
        {extra}
      </div>
      {children}
    </div>
  );
}

function ESec({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "var(--mono)", marginBottom: 7 }}>{children}</div>;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 5px", background: "var(--bg3)", border: "1px solid var(--rim2)", borderRadius: 3, fontSize: 9, fontFamily: "var(--mono)", color: "var(--text3)" }}>{children}</span>;
}

function Skel({ height, width }: { height: number | string; width: number | string }) {
  return (
    <div style={{
      height, width, borderRadius: 4,
      background: "linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.6s infinite",
    }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--rim2)", borderRadius: 12, padding: 22, width: 380, maxWidth: "92vw", boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ padding: "3px 9px", background: "none", border: "1px solid var(--rim)", borderRadius: 6, fontSize: 10, color: "var(--text2)", cursor: "pointer", fontFamily: "var(--font)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
