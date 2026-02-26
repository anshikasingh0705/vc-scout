"use client";
// components/SavedPage.tsx

import { useState } from "react";
import type { SavedSearch } from "@/types";
import { STAGES, SECTORS } from "@/lib/data";

interface SavedProps {
  saved: SavedSearch[];
  setSaved: (fn: (prev: SavedSearch[]) => SavedSearch[]) => void;
  onRun: (s: SavedSearch) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}

export function SavedPage({ saved, setSaved, onRun, toast }: SavedProps) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("All Stages");
  const [sector, setSector] = useState("All Sectors");

  const create = () => {
    if (!name.trim()) return;
    setSaved(ss => [...ss, { id: Date.now().toString(), name: name.trim(), query: q, stage, sector, created: Date.now(), runs: 0 }]);
    setShow(false); setName(""); setQ(""); setStage("All Stages"); setSector("All Sectors");
    toast("Search saved", "success");
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Saved Searches</div>
          <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2 }}>Always-on discovery · {saved.length} saved</div>
        </div>
        <button onClick={() => setShow(true)} style={goldBtnStyle}>+ Save search</button>
      </div>

      {saved.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, padding: 48, gap: 6, textAlign: "center" }}>
          <div style={{ fontSize: 28, opacity: 0.35 }}>⌁</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>No saved searches</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>Save a search to re-run it anytime</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {saved.map(s => (
            <div key={s.id} style={{ background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: "var(--text2)", fontFamily: "var(--mono)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[s.query && `"${s.query}"`, s.stage !== "All Stages" && s.stage, s.sector !== "All Sectors" && s.sector].filter(Boolean).join(" · ") || "All companies"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 3 }}>
                  Saved {new Date(s.created).toLocaleDateString()} · {s.runs || 0} runs
                </div>
              </div>
              <button onClick={() => { setSaved(ss => ss.map(x => x.id === s.id ? { ...x, runs: (x.runs || 0) + 1 } : x)); onRun(s); toast("Running...", "success"); }} style={goldBtnStyle}>
                ▶ Run
              </button>
              <button onClick={() => { setSaved(ss => ss.filter(x => x.id !== s.id)); toast("Deleted", "success"); }} style={redBtnStyle}>✕</button>
            </div>
          ))}
        </div>
      )}

      {show && (
        <Modal title="Save search" onClose={() => setShow(false)}>
          <input style={inputStyle} placeholder="Search name" value={name} onChange={e => setName(e.target.value)} autoFocus />
          <input style={inputStyle} placeholder="Keyword query (optional)" value={q} onChange={e => setQ(e.target.value)} />
          <select style={{ ...inputStyle, cursor: "pointer" }} value={stage} onChange={e => setStage(e.target.value)}>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={sector} onChange={e => setSector(e.target.value)}>
            {SECTORS.map(s => <option key={s}>{s}</option>)}
          </select>
          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={() => setShow(false)} style={ghostBtnStyle}>Cancel</button>
            <button onClick={create} style={goldBtnStyle}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ThesisPage ───────────────────────────────────────────────────────────────

import type { Company } from "@/types";
import { COMPANIES, THESIS, isThesisMatch, scoreColor, stageColor } from "@/lib/data";

export function ThesisPage({ onCompany }: { onCompany: (c: Company) => void }) {
  const matches = COMPANIES.filter(isThesisMatch).sort((a, b) => b.score - a.score);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Fund Thesis</div>
        <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2 }}>Drives all scoring, filtering and matching</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {/* Focus */}
          <ThCard title="Investment Focus">
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.75 }}>{THESIS.summary}</div>
          </ThCard>
          {/* Keywords */}
          <ThCard title="Target Keywords">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {THESIS.keywords.map(k => (
                <span key={k} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 10, fontFamily: "var(--mono)", background: "rgba(245,158,11,0.08)", color: "var(--gold)", border: "1px solid rgba(245,158,11,0.2)" }}>{k}</span>
              ))}
            </div>
          </ThCard>
          {/* Stages */}
          <ThCard title="Target Stages">
            <div style={{ display: "flex", gap: 8 }}>
              {THESIS.stages.map(s => {
                const stc = stageColor(s);
                return <span key={s} style={{ padding: "4px 10px", borderRadius: 3, fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", background: `${stc}20`, color: stc, border: `1px solid ${stc}44` }}>{s}</span>;
              })}
            </div>
          </ThCard>
          {/* Weights */}
          <ThCard title="Scoring Weights">
            {THESIS.weights.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 0", borderBottom: "1px solid var(--rim)" }}>
                <span style={{ color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 10 }}>{k}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </ThCard>
        </div>

        <div>
          <ThCard title="Live Pipeline">
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 6, fontSize: 11, color: "var(--green)", fontWeight: 600, marginBottom: 12 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)", animation: "blink 2s ease-in-out infinite", display: "block" }} />
              {matches.length} companies match right now
              <style>{`@keyframes blink { 0%,100%{opacity:1}50%{opacity:0.3} }`}</style>
            </div>
            {matches.map(c => {
              const stc = stageColor(c.stage);
              return (
                <div key={c.id} onClick={() => onCompany(c)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 0", borderBottom: "1px solid var(--rim)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "0.7"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}>
                  <div style={{ width: 24, height: 24, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: stc, background: `${stc}15`, border: `1px solid ${stc}44` }}>{c.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{c.stage} · {c.sector}</div>
                  </div>
                  <span style={{ color: scoreColor(c.score), fontFamily: "var(--mono)", fontWeight: 700 }}>{c.score}</span>
                </div>
              );
            })}
          </ThCard>
        </div>
      </div>
    </div>
  );
}

function ThCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "var(--mono)", marginBottom: 11 }}>{title}</div>
      {children}
    </div>
  );
}

// ─── FollowingPage ────────────────────────────────────────────────────────────

export function FollowingPage({ following, toggleFollow, onCompany, toast }: {
  following: string[];
  toggleFollow: (id: string) => void;
  onCompany: (c: Company) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const cos = COMPANIES.filter(c => following.includes(c.id));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Following</div>
        <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2 }}>{cos.length} companies tracked · press f on any profile</div>
      </div>

      {cos.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, padding: 48, gap: 6, textAlign: "center" }}>
          <div style={{ fontSize: 28, opacity: 0.35 }}>◈</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Not following anyone</div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>Open a company profile and press f or click + Follow</div>
        </div>
      ) : (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg3)" }}>
                {["Company","Stage","Sector","Score","Thesis",""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, color: "var(--text3)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "var(--mono)", borderBottom: "1px solid var(--rim)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cos.map(c => {
                const stc = stageColor(c.stage);
                const match = isThesisMatch(c);
                return (
                  <tr key={c.id} onClick={() => onCompany(c)} style={{ cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg3)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--rim)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: stc, background: `${stc}15`, border: `1px solid ${stc}44` }}>{c.name[0]}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text3)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description.slice(0, 55)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--rim)" }}>
                      <span style={{ padding: "2px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)", background: `${stc}20`, color: stc, border: `1px solid ${stc}44` }}>{c.stage}</span>
                    </td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--rim)", fontSize: 11, color: "var(--text2)" }}>{c.sector}</td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--rim)", color: scoreColor(c.score), fontFamily: "var(--mono)", fontWeight: 600 }}>{c.score}</td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--rim)" }}>
                      {match
                        ? <span style={{ color: "var(--green)", fontSize: 10, fontFamily: "var(--mono)" }}>✓</span>
                        : <span style={{ color: "var(--text3)", fontSize: 10 }}>-</span>}
                    </td>
                    <td style={{ padding: "9px 12px", borderBottom: "1px solid var(--rim)" }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { toggleFollow(c.id); toast("Unfollowed", "success"); }} style={redBtnStyle}>Unfollow</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Shared styles
const goldBtnStyle: React.CSSProperties = { padding: "5px 12px", background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" };
const ghostBtnStyle: React.CSSProperties = { padding: "4px 10px", background: "none", color: "var(--text2)", border: "1px solid var(--rim)", borderRadius: 6, fontSize: 10, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600 };
const redBtnStyle: React.CSSProperties = { padding: "2px 7px", background: "rgba(239,68,68,0.08)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, fontSize: 9, cursor: "pointer", fontFamily: "var(--font)" };
const inputStyle: React.CSSProperties = { width: "100%", background: "var(--bg3)", border: "1px solid var(--rim)", color: "var(--text)", fontSize: 12, padding: "7px 10px", borderRadius: 6, marginBottom: 8, outline: "none", fontFamily: "var(--font)" };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--rim2)", borderRadius: 12, padding: 22, width: 380, maxWidth: "92vw", boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={ghostBtnStyle}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
