// lib/useLocalStorage.ts
// Type-safe localStorage hook with SSR safety (Next.js compatible)

import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // On SSR (Next.js server render), localStorage doesn't exist — use initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Sync to localStorage whenever value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch {
      // localStorage can be full or blocked in private mode — fail silently
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
