"use client";
// components/AppShell.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import type { Company, SavedList, SavedSearch, EnrichmentResult } from "@/types";
import { COMPANIES } from "@/lib/data";
import { CompaniesPage } from "./CompaniesPage";
import { CompanyProfile } from "./CompanyProfile";
import { ListsPage } from "./ListsPage";
import { SavedPage, ThesisPage, FollowingPage } from "./Pages";
import { CommandPalette } from "./CommandPalette";
import { ShortcutsModal } from "./ShortcutsModal";
import { ToastList, useToast } from "./Toast";
import styles from "./AppShell.module.css";

type Page = "companies" | "thesis" | "lists" | "saved" | "following";

export function AppShell() {
  const [page, setPage] = useState<Page>("companies");
  const [company, setCompany] = useState<Company | null>(null);
  const [lists, setLists] = useLocalStorage<SavedList[]>("vcs-lists", []);
  const [saved, setSaved] = useLocalStorage<SavedSearch[]>("vcs-saved", []);
  const [notes, setNotes] = useLocalStorage<Record<string, string>>("vcs-notes", {});
  const [following, setFollowing] = useLocalStorage<string[]>("vcs-following", []);
  const [enrichCache, setEnrichCache] = useLocalStorage<Record<string, EnrichmentResult>>("vcs-cache", {});
  const [extQuery, setExtQuery] = useState("");
  const [gsearch, setGsearch] = useState("");
  const [showCmd, setShowCmd] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { toasts, toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const addToList = useCallback((lid: string, ids: string[]) => {
    setLists(ls => ls.map(l => l.id === lid
      ? { ...l, companies: [...new Set([...l.companies, ...ids])] }
      : l
    ));
  }, [setLists]);

  const toggleFollow = useCallback((id: string) => {
    setFollowing(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  }, [setFollowing]);

  const openCompany = useCallback((c: Company) => {
    setCompany(c);
    setPage("companies");
  }, []);

  const go = useCallback((p: Page) => {
    setPage(p);
    setCompany(null);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCmd(s => !s);
        return;
      }
      if (e.key === "?" && !target.matches("input,textarea")) {
        setShowShortcuts(s => !s);
        return;
      }
      if (e.key === "/" && !target.matches("input,textarea")) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        setGsearch("");
        searchRef.current?.blur();
        setShowCmd(false);
        setShowShortcuts(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const NAV = [
    { id: "companies" as Page, icon: "◆", label: "Companies", badge: COMPANIES.length },
    { id: "thesis" as Page,    icon: "◇", label: "Thesis",    badge: null },
    { id: "lists" as Page,     icon: "▤", label: "Lists",     badge: lists.length || null },
    { id: "saved" as Page,     icon: "⌁", label: "Saved",     badge: saved.length || null },
    { id: "following" as Page, icon: "◈", label: "Following", badge: following.length || null },
  ];

  const pageLabel = company && page === "companies"
    ? company.name
    : { companies:"Companies", thesis:"Thesis", lists:"Lists", saved:"Saved Searches", following:"Following" }[page];

  return (
    <div className={styles.app}>
      {/* ── SIDEBAR ── */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>VC</div>
          <div>
            <div className={styles.logoName}>Scout</div>
            <div className={styles.logoSub}>Intelligence</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSec}>Discover</div>
          {NAV.map(n => (
            <button
              key={n.id}
              className={`${styles.navBtn} ${page === n.id && !company ? styles.navBtnActive : ""}`}
              onClick={() => go(n.id)}
            >
              <span className={styles.navIcon}>{n.icon}</span>
              {n.label}
              {n.badge !== null && <span className={styles.navBadge}>{n.badge}</span>}
            </button>
          ))}

          <div className={styles.navSec} style={{ marginTop: 8 }}>Tools</div>
          <button className={styles.navBtn} onClick={() => setShowCmd(true)}>
            <span className={styles.navIcon}>⌘</span>
            Command Palette
            <span className={styles.kbd} style={{ marginLeft: "auto" }}>⌘K</span>
          </button>
          <button className={styles.navBtn} onClick={() => setShowShortcuts(true)}>
            <span className={styles.navIcon}>?</span>
            Shortcuts
            <span className={styles.kbd} style={{ marginLeft: "auto" }}>?</span>
          </button>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.thesisBox}>
            <div className={styles.thesisBoxLabel}>
              <span className={styles.thesisDot} />
              Thesis
            </div>
            <div className={styles.thesisBoxText}>
              B2B AI SaaS · infra &amp; dev tools · regulated verticals · Pre-Seed to A
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className={styles.main}>
        {/* Topbar */}
        <div className={styles.topbar}>
          <div className={styles.topbarTitle}>{pageLabel}</div>
          <div className={styles.topbarSep} />
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>⌕</span>
            <input
              ref={searchRef}
              className={styles.searchInput}
              placeholder="Search... (press / to focus)"
              value={gsearch}
              onChange={e => setGsearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && gsearch.trim()) {
                  setExtQuery(gsearch);
                  setPage("companies");
                  setCompany(null);
                }
              }}
            />
          </div>
          <div className={styles.topbarRight}>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => setShowCmd(true)}>
              ⌘ Palette <span className={styles.kbd}>⌘K</span>
            </button>
            <button className={`${styles.btn} ${styles.btnGold} ${styles.btnSm}`} onClick={() => { go("companies"); }}>
              + Add
            </button>
          </div>
        </div>

        {/* Page content */}
        {company && page === "companies" ? (
          <CompanyProfile
            company={company}
            onBack={() => setCompany(null)}
            lists={lists}
            addToList={addToList}
            notes={notes}
            setNotes={setNotes}
            following={following}
            toggleFollow={toggleFollow}
            enrichCache={enrichCache}
            setEnrichCache={setEnrichCache}
            toast={toast}
          />
        ) : page === "companies" ? (
          <CompaniesPage
            onSelect={setCompany}
            addToList={addToList}
            lists={lists}
            toast={toast}
            extQuery={extQuery}
            clearExtQuery={() => setExtQuery("")}
          />
        ) : page === "lists" ? (
          <ListsPage lists={lists} setLists={setLists} onSelectCompany={openCompany} toast={toast} />
        ) : page === "saved" ? (
          <SavedPage
            saved={saved}
            setSaved={setSaved}
            onRun={s => { setExtQuery(s.query || ""); setPage("companies"); setCompany(null); }}
            toast={toast}
          />
        ) : page === "thesis" ? (
          <ThesisPage onCompany={c => { setCompany(c); setPage("companies"); }} />
        ) : page === "following" ? (
          <FollowingPage following={following} toggleFollow={toggleFollow} onCompany={openCompany} toast={toast} />
        ) : null}
      </div>

      {/* Overlays */}
      <ToastList toasts={toasts} />
      {showCmd && (
        <CommandPalette
          onClose={() => setShowCmd(false)}
          onNavigate={go}
          onOpenCompany={c => { openCompany(c); setShowCmd(false); }}
        />
      )}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
