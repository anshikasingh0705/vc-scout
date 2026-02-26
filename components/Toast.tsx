"use client";
// components/Toast.tsx

import { useState, useCallback } from "react";

export interface ToastItem {
  id: number;
  msg: string;
  type: "success" | "error";
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  return { toasts, toast };
}

export function ToastList({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div style={{ position: "fixed", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 6, zIndex: 400, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            padding: "8px 14px",
            background: "var(--bg2)",
            border: `1px solid ${t.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 7,
            fontSize: 11,
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontWeight: 500,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            animation: "slideIn 0.18s ease",
          }}
        >
          <span style={{ color: t.type === "success" ? "var(--green)" : "var(--red)" }}>
            {t.type === "success" ? "✓" : "!"}
          </span>
          {t.msg}
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
