"use client";
// components/CompaniesPage.tsx

import { useState, useEffect, useMemo, useRef } from "react";
import type { Company, SavedList } from "@/types";
import { COMPANIES, STAGES, SECTORS, isThesisMatch, scoreColor, stageColor } from "@/lib/data";

interface Props {
  onSelect: (c: Company) => void;
  addToList: (lid: string, ids: string[]) => void;
  lists: SavedList[];
  toast: (msg: string, type?: "success" | "error") => void;
  extQuery: string;
  clearExtQuery: () => void;
}

export function CompaniesPage({ onSelect, addToList, lists, toast, extQuery, clearExtQuery }: Props) {
  const [q, setQ] = useState(extQuery || "");
  const [stage, setStage] = useState("All Stages");
  const [sector, setSector] = useState("All Sectors");
  const [thOnly, setThOnly] = useState(false);
  const [sort, setSort] = useState<{ col: keyof typeof COMPANIES[0]; dir: "asc" | "desc" }>({ col: "score", dir: "desc" });
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string[]>([]);
  const [rowIdx, setRowIdx] = useState(-1);
  const [showListModal, setShowListModal] = useState(false);
  const qRef = useRef<HTMLInputElement>(null);
  const PER = 8;

  useEffect(() => {
    if (extQuery) { setQ(extQuery); clearExtQuery(); setPage(1); }
  }, [extQuery]);

  const rows = useMemo(() => {
    let r = [...COMPANIES];
    if (q) {
      const lq = q.toLowerCase();
      r = r.filter(c =>
        c.name.toLowerCase().includes(lq) ||
        c.description.toLowerCase().includes(lq) ||
        c.tags.some(t => t.toLowerCase().includes(lq)) ||
        c.sector.toLowerCase().includes(lq) ||
        c.hq.toLowerCase().includes(lq)
      );
    }
    if (stage !== "All Stages") r = r.filter(c => c.stage === stage);
    if (sector !== "All Sectors") r = r.filter(c => c.sector === sector);
    if (thOnly) r = r.filter(isThesisMatch);
    r.sort((a, b) => {
      const av = a[sort.col] as string | number;
      const bv = b[sort.col] as string | number;
      return sort.dir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return r;
  }, [q, stage, sector, thOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PER));
  const paged = rows.slice((page - 1) * PER, page * PER);

  const sortBy = (col: keyof typeof COMPANIES[0]) =>
    setSort(s => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  const arrow = (col: string) => sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : "";
  const toggleSel = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "j") setRowIdx(i => Math.min(i + 1, paged.length - 1));
      if (e.key === "k") setRowIdx(i => Math.max(i - 1, 0));
      if (e.key === "Enter" && rowIdx >= 0) onSelect(paged[rowIdx]);
      if (e.key === "/") { e.preventDefault(); qRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [paged, rowIdx]);

  const exportSel = () => {
    const cos = COMPANIES.filter(c => sel.includes(c.id));
    const csv = [
      ["Name","Stage","Sector","HQ","Score","Website","Description"],
      ...cos.map(c => [c.name, c.stage, c.sector, c.hq, c.score, c.website, `"${c.description}"`]),
    ].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "companies.csv";
    a.click();
    toast(`Exported ${sel.length} companies`, "success");
  };

  const selBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: "2px 9px", background: "none", border: "1px solid var(--rim)", borderRadius: 6, fontSize: 10, color: "var(--text2)", cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600 }}>{label}</button>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", fontSize: 12, pointerEvents: "none" }}>⌕</span>
          <input
            ref={qRef}
            style={{ padding: "5px 10px 5px 28px", background: "var(--bg3)", border: "1px solid var(--rim)", borderRadius: 6, color: "var(--text)", fontSize: 12, width: 200, outline: "none" }}
            placeholder="Filter companies..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
          />
        </div>
        <select style={{ background: "var(--bg3)", border: "1px solid var(--rim)", color: "var(--text2)", fontSize: 11, fontFamily: "var(--font)", padding: "5px 9px", borderRadius: 6, cursor: "pointer", outline: "none" }} value={stage} onChange={e => { setStage(e.target.value); setPage(1); }}>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select style={{ background: "var(--bg3)", border: "1px solid var(--rim)", color: "var(--text2)", fontSize: 11, fontFamily: "var(--font)", padding: "5px 9px", borderRadius: 6, cursor: "pointer", outline: "none" }} value={sector} onChange={e => { setSector(e.target.value); setPage(1); }}>
          {SECTORS.map(s => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={() => { setThOnly(t => !t); setPage(1); }}
          style={{ padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600, border: "1px solid", cursor: "pointer", fontFamily: "var(--mono)", background: thOnly ? "rgba(245,158,11,0.1)" : "var(--bg3)", color: thOnly ? "var(--gold)" : "var(--text2)", borderColor: thOnly ? "rgba(245,158,11,0.35)" : "var(--rim)" }}
        >
          ◆ Thesis match
        </button>
        {sel.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, fontSize: 11, color: "var(--gold)", fontWeight: 600 }}>
            <span>{sel.length} selected</span>
            {selBtn("+ List", () => setShowListModal(true))}
            {selBtn("↓ CSV", exportSel)}
            {selBtn("✕", () => setSel([]))}
          </div>
        )}
        <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", padding: "3px 8px", background: "var(--bg3)", border: "1px solid var(--rim)", borderRadius: 10 }}>
          {rows.length} companies
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg3)" }}>
              <th style={{ ...thStyle, width: 28 }}>
                <input type="checkbox" style={{ width: 13, height: 13, cursor: "pointer", accentColor: "var(--gold)" }}
                  onChange={e => e.target.checked ? setSel(paged.map(c => c.id)) : setSel([])} />
              </th>
              {([["name","Company"],["stage","Stage"],["sector","Sector"],["score","Score"],["founded","Founded"]] as [string,string][]).map(([col, label]) => (
                <th key={col} style={{ ...thStyle, cursor: "pointer" }} onClick={() => sortBy(col as keyof typeof COMPANIES[0])}>{label}{arrow(col)}</th>
              ))}
              <th style={thStyle}>Tags</th>
              <th style={thStyle}>Thesis</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={8}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", gap: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 28, opacity: 0.35 }}>🔍</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>No companies found</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>Try adjusting your filters</div>
                </div>
              </td></tr>
            )}
            {paged.map((c, i) => {
              const stc = stageColor(c.stage);
              const sc = scoreColor(c.score);
              return (
                <tr
                  key={c.id}
                  onClick={() => { onSelect(c); setRowIdx(i); }}
                  style={{ cursor: "pointer", background: sel.includes(c.id) || rowIdx === i ? "rgba(245,158,11,0.05)" : "transparent" }}
                  onMouseEnter={e => { if (!sel.includes(c.id) && rowIdx !== i) (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg3)"; }}
                  onMouseLeave={e => { if (!sel.includes(c.id) && rowIdx !== i) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                >
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" style={{ width: 13, height: 13, cursor: "pointer", accentColor: "var(--gold)" }} checked={sel.includes(c.id)} onChange={() => toggleSel(c.id)} />
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: `${stc}15`, border: `1px solid ${stc}44`, color: stc }}>{c.name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>{c.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ padding: "2px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)", background: `${stc}20`, color: stc, border: `1px solid ${stc}44` }}>{c.stage}</span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, color: "var(--text2)" }}>{c.sector}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500, minWidth: 24, color: sc }}>{c.score}</span>
                      <div style={{ width: 36, height: 2, background: "var(--bg4)", borderRadius: 1, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 1, background: sc, width: `${c.score}%` }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, color: "var(--text3)", fontFamily: "var(--mono)" }}>{c.founded}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {c.tags.slice(0, 2).map(t => <span key={t} style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--rim)", fontFamily: "var(--mono)" }}>{t}</span>)}
                      {c.tags.length > 2 && <span style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--rim)", fontFamily: "var(--mono)" }}>+{c.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {isThesisMatch(c)
                      ? <span style={{ color: "var(--green)", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 500 }}>✓ Match</span>
                      : <span style={{ color: "var(--text3)", fontSize: 10, fontFamily: "var(--mono)" }}>-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Pager */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderTop: "1px solid var(--rim)", background: "var(--bg3)" }}>
          <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>
            Page {page}/{totalPages} · {rows.length} results
            <span style={{ color: "var(--text3)", opacity: 0.6, marginLeft: 8 }}>j/k navigate · Enter open · / search · ? help</span>
          </span>
          <div style={{ display: "flex", gap: 3 }}>
            <PBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>&larr;</PBtn>
            {Array.from({ length: totalPages }, (_, i) => (
              <PBtn key={i + 1} active={page === i + 1} onClick={() => setPage(i + 1)}>{i + 1}</PBtn>
            ))}
            <PBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>&rarr;</PBtn>
          </div>
        </div>
      </div>

      {/* Add to list modal */}
      {showListModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }}
          onClick={e => e.target === e.currentTarget && setShowListModal(false)}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--rim2)", borderRadius: 12, padding: 22, width: 380, maxWidth: "92vw", boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Add {sel.length} to list</div>
              <button onClick={() => setShowListModal(false)} style={{ padding: "3px 9px", background: "none", border: "1px solid var(--rim)", borderRadius: 6, fontSize: 10, color: "var(--text2)", cursor: "pointer", fontFamily: "var(--font)" }}>✕</button>
            </div>
            {lists.length === 0
              ? <div style={{ fontSize: 12, color: "var(--text2)" }}>Create a list first in the Lists tab.</div>
              : lists.map(l => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--rim)" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{l.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{l.companies.length} companies</div>
                  </div>
                  <button onClick={() => { addToList(l.id, sel); setShowListModal(false); setSel([]); toast(`Added to "${l.name}"`, "success"); }}
                    style={{ padding: "3px 9px", background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>
                    Add
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
const thStyle: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: 9, color: "var(--text3)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "var(--mono)", fontWeight: 400, whiteSpace: "nowrap", borderBottom: "1px solid var(--rim)", userSelect: "none" };
const tdStyle: React.CSSProperties = { padding: "9px 12px", fontSize: 12, borderBottom: "1px solid var(--rim)", verticalAlign: "middle" };

function PBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: "3px 8px", background: active ? "rgba(245,158,11,0.1)" : "var(--bg2)", border: `1px solid ${active ? "rgba(245,158,11,0.35)" : "var(--rim)"}`, color: active ? "var(--gold)" : "var(--text2)", borderRadius: 4, fontSize: 10, fontFamily: "var(--mono)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.3 : 1, transition: "all 0.13s" }}
    >
      {children}
    </button>
  );
}
