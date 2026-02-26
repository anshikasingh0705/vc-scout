"use client";
// components/ListsPage.tsx

import { useState } from "react";
import type { Company, SavedList } from "@/types";
import { COMPANIES, scoreColor, stageColor } from "@/lib/data";

interface Props {
  lists: SavedList[];
  setLists: (fn: (prev: SavedList[]) => SavedList[]) => void;
  onSelectCompany: (c: Company) => void;
  toast: (msg: string, type?: "success" | "error") => void;
}

export function ListsPage({ lists, setLists, onSelectCompany, toast }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const create = () => {
    if (!name.trim()) return;
    const l: SavedList = { id: Date.now().toString(), name: name.trim(), description: desc.trim(), companies: [], created: Date.now() };
    setLists(ls => [...ls, l]);
    setActive(l.id);
    setShowCreate(false);
    setName(""); setDesc("");
    toast("List created", "success");
  };

  const del = (id: string) => {
    setLists(ls => ls.filter(l => l.id !== id));
    if (active === id) setActive(null);
    toast("Deleted", "success");
  };

  const remove = (lid: string, cid: string) =>
    setLists(ls => ls.map(l => l.id === lid ? { ...l, companies: l.companies.filter(x => x !== cid) } : l));

  const exportList = (list: SavedList, fmt: "csv" | "json") => {
    const cos = COMPANIES.filter(c => list.companies.includes(c.id));
    const content = fmt === "csv"
      ? [["Name","Stage","Sector","HQ","Score","Website"], ...cos.map(c => [c.name,c.stage,c.sector,c.hq,c.score,c.website])].map(r => r.join(",")).join("\n")
      : JSON.stringify(cos, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: fmt === "csv" ? "text/csv" : "application/json" }));
    a.download = `${list.name}.${fmt}`;
    a.click();
    toast(`Exported as ${fmt.toUpperCase()}`, "success");
  };

  const activeList = lists.find(l => l.id === active);
  const activeCos = activeList ? COMPANIES.filter(c => activeList.companies.includes(c.id)) : [];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Lists</div>
          <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2 }}>{lists.length} lists · localStorage persisted</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={goldBtnStyle}>+ New list</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 12, height: "calc(100vh - 130px)" }}>
        {/* Left: list cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
          {lists.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, gap: 6, textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.35 }}>▤</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>No lists yet</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>Create your first list</div>
            </div>
          )}
          {lists.map(l => (
            <div
              key={l.id}
              onClick={() => setActive(l.id)}
              style={{ border: `1px solid ${active === l.id ? "rgba(245,158,11,0.35)" : "var(--rim)"}`, borderRadius: 8, padding: "12px 13px", cursor: "pointer", background: active === l.id ? "rgba(245,158,11,0.05)" : "var(--bg2)" } as React.CSSProperties}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</div>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text3)", marginTop: 2 }}>{l.companies.length} cos · {new Date(l.created).toLocaleDateString()}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); del(l.id); }} style={{ padding: "2px 7px", background: "rgba(239,68,68,0.08)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, fontSize: 9, cursor: "pointer", fontFamily: "var(--font)" }}>✕</button>
              </div>
              {l.description && <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 7, lineHeight: 1.5 }}>{l.description}</div>}
            </div>
          ))}
        </div>

        {/* Right: detail */}
        <div style={{ minHeight: 0 }}>
          {activeList ? (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--rim)", display: "flex", alignItems: "center", gap: 10, background: "var(--bg3)", flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{activeList.name}</div>
                <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{activeCos.length} companies</div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button onClick={() => exportList(activeList, "csv")} style={ghostBtnStyle}>↓ CSV</button>
                  <button onClick={() => exportList(activeList, "json")} style={ghostBtnStyle}>↓ JSON</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {activeCos.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, gap: 6, textAlign: "center" }}>
                    <div style={{ fontSize: 28, opacity: 0.35 }}>🏢</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Empty list</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>Add companies from the Companies page</div>
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["Company","Stage","Score",""].map(h => (
                        <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 9, color: "var(--text3)", fontFamily: "var(--mono)", letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid var(--rim)", background: "var(--bg3)" }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {activeCos.map(co => {
                        const stc = stageColor(co.stage);
                        return (
                          <tr key={co.id} onClick={() => onSelectCompany(co)} style={{ cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg3)"}
                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}>
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--rim)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <div style={{ width: 24, height: 24, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: stc, background: `${stc}15`, border: `1px solid ${stc}44` }}>{co.name[0]}</div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 12 }}>{co.name}</div>
                                  <div style={{ fontSize: 10, color: "var(--text3)" }}>{co.sector}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--rim)" }}>
                              <span style={{ padding: "2px 7px", borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: "var(--mono)", background: `${stc}20`, color: stc, border: `1px solid ${stc}44` }}>{co.stage}</span>
                            </td>
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--rim)", color: scoreColor(co.score), fontFamily: "var(--mono)", fontWeight: 600 }}>{co.score}</td>
                            <td style={{ padding: "9px 14px", borderBottom: "1px solid var(--rim)" }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => { remove(activeList.id, co.id); toast("Removed", "success"); }} style={ghostBtnStyle}>Remove</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg2)", border: "1px solid var(--rim)", borderRadius: 10, height: "100%", gap: 6 }}>
              <div style={{ fontSize: 28, opacity: 0.35 }}>👈</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>Select a list</div>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Create list" onClose={() => setShowCreate(false)}>
          <input style={modalInputStyle} placeholder="List name (e.g. Q1 Pipeline)" value={name} onChange={e => setName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && create()} />
          <input style={modalInputStyle} placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={() => setShowCreate(false)} style={ghostBtnStyle}>Cancel</button>
            <button onClick={create} style={goldBtnStyle}>Create</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

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

const goldBtnStyle: React.CSSProperties = { padding: "5px 12px", background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" };
const ghostBtnStyle: React.CSSProperties = { padding: "4px 10px", background: "none", color: "var(--text2)", border: "1px solid var(--rim)", borderRadius: 6, fontSize: 10, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 600 };
const modalInputStyle: React.CSSProperties = { width: "100%", background: "var(--bg3)", border: "1px solid var(--rim)", color: "var(--text)", fontSize: 12, padding: "7px 10px", borderRadius: 6, marginBottom: 8, outline: "none", fontFamily: "var(--font)" };
