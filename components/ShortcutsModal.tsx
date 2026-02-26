"use client";
// components/ShortcutsModal.tsx

import { useEffect } from "react";

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const shortcuts = [
    ["⌘K", "Command palette"], ["/", "Focus search"], ["Esc", "Close / clear"],
    ["j / k", "Navigate rows"], ["↵", "Open company"], ["e", "Enrich company"],
    ["f", "Follow / unfollow"], ["n", "Focus notes"], ["b", "Back to list"], ["?", "This menu"],
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--bg2)", border: "1px solid var(--rim2)", borderRadius: 12, padding: 22, width: 380, maxWidth: "92vw", boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Keyboard Shortcuts</div>
          <button onClick={onClose} style={{ padding: "3px 9px", background: "none", border: "1px solid var(--rim)", borderRadius: 6, fontSize: 10, color: "var(--text2)", cursor: "pointer", fontFamily: "var(--font)" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 20px" }}>
          {shortcuts.map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
              <span style={{ color: "var(--text2)" }}>{v}</span>
              <span style={{ display: "inline-flex", alignItems: "center", padding: "1px 5px", background: "var(--bg3)", border: "1px solid var(--rim2)", borderRadius: 3, fontSize: 9, fontFamily: "var(--mono)", color: "var(--text3)" }}>{k}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
