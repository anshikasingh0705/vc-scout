"use client";
// components/CommandPalette.tsx

import { useState, useEffect, useRef } from "react";
import type { Company } from "@/types";
import { COMPANIES, scoreColor, stageColor } from "@/lib/data";

type Page = "companies" | "thesis" | "lists" | "saved" | "following";

interface Props {
  onClose: () => void;
  onNavigate: (p: Page) => void;
  onOpenCompany: (c: Company) => void;
}

export function CommandPalette({ onClose, onNavigate, onOpenCompany }: Props) {
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const pages: { icon: string; label: string; id: Page }[] = [
    { icon: "◆", label: "Companies", id: "companies" },
    { icon: "◇", label: "Thesis",    id: "thesis" },
    { icon: "▤", label: "Lists",     id: "lists" },
    { icon: "⌁", label: "Saved Searches", id: "saved" },
    { icon: "◈", label: "Following", id: "following" },
  ];

  const coResults = COMPANIES.filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.sector.toLowerCase().includes(q.toLowerCase())
  );

  type Item = { icon: string; label: string; sub?: string; action: () => void; isPage?: boolean; score?: number; stageCol?: string };
  const items: Item[] = [
    ...(!q ? pages.map(p => ({ icon: p.icon, label: p.label, isPage: true, action: () => { onNavigate(p.id); onClose(); } })) : []),
    ...coResults.map(c => ({
      icon: c.name[0],
      label: c.name,
      sub: `${c.stage} · ${c.sector}`,
      score: c.score,
      stageCol: stageColor(c.stage),
      action: () => { onOpenCompany(c); onClose(); },
    })),
  ];

  useEffect(() => setHi(0), [q]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setHi(i => Math.min(i + 1, items.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setHi(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && items[hi]) items[hi].action();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [items, hi, onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 300, paddingTop: "13vh", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--bg2)", border: "1px solid var(--rim2)", borderRadius: 12, width: 520, maxWidth: "92vw", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search companies, navigate pages..."
          style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", borderBottom: "1px solid var(--rim)", color: "var(--text)", fontSize: 14, fontWeight: 500, outline: "none", fontFamily: "var(--font)" }}
        />
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {!q && <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--mono)", padding: "8px 14px 4px" }}>Pages</div>}
          {items.map((item, i) => (
            <div
              key={i}
              onClick={item.action}
              onMouseEnter={() => setHi(i)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 14px",
                cursor: "pointer", fontSize: 12, color: hi === i ? "var(--gold)" : "var(--text2)",
                background: hi === i ? "rgba(245,158,11,0.08)" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, flexShrink: 0, fontWeight: 700,
                background: item.stageCol ? `${item.stageCol}22` : "var(--bg3)",
                color: item.stageCol ?? "var(--text3)",
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{item.label}</span>
                {item.sub && <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginLeft: 8 }}>{item.sub}</span>}
              </div>
              {item.score !== undefined && (
                <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: scoreColor(item.score) }}>{item.score}</span>
              )}
            </div>
          ))}
          {!q && coResults.length > 0 && <div style={{ fontSize: 9, color: "var(--text3)", letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--mono)", padding: "8px 14px 4px" }}>Companies</div>}
          {q && coResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 20px", fontSize: 11, color: "var(--text3)" }}>No results for &quot;{q}&quot;</div>
          )}
        </div>
        <div style={{ padding: "8px 14px", borderTop: "1px solid var(--rim)", display: "flex", gap: 12, background: "var(--bg3)" }}>
          {[["↑↓", "navigate"], ["↵", "open"], ["Esc", "close"]].map(([k, v]) => (
            <span key={k} style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 5px", background: "var(--bg2)", border: "1px solid var(--rim2)", borderRadius: 3, fontSize: 9 }}>{k}</span>
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
