import { useEffect, useReducer } from "react";
import type { Table } from "./types";

// ————————————————————————————————————————————————————————————
// Embedded persistence engine.
// In production this layer is Supabase (see supabase/migrations).
// Locally it persists with the same table semantics so every
// workflow — auth, jobs, campaigns, billing — runs end-to-end.
// ————————————————————————————————————————————————————————————

const NS = "zybble.v1";

const cache = new Map<string, Record<string, unknown>[]>();
const listeners = new Set<(t: string) => void>();

function read<T>(table: Table): T[] {
  if (!cache.has(table)) {
    let rows: T[] = [];
    try {
      const raw = localStorage.getItem(`${NS}.${table}`);
      if (raw) rows = JSON.parse(raw) as T[];
    } catch {
      rows = [];
    }
    cache.set(table, rows as Record<string, unknown>[]);
  }
  return cache.get(table) as unknown as T[];
}

function persist(table: Table) {
  localStorage.setItem(`${NS}.${table}`, JSON.stringify(cache.get(table) ?? []));
  queueMicrotask(() => listeners.forEach((fn) => fn(table)));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function now(): string {
  return new Date().toISOString();
}

export const db = {
  all<T>(table: Table): T[] {
    return read<T>(table);
  },
  where<T>(table: Table, fn: (row: T) => boolean): T[] {
    return read<T>(table).filter(fn);
  },
  one<T>(table: Table, fn: (row: T) => boolean): T | null {
    return read<T>(table).find(fn) ?? null;
  },
  byId<T extends { id: string }>(table: Table, id: string): T | null {
    return read<T>(table).find((r) => r.id === id) ?? null;
  },
  insert<T extends { id: string }>(table: Table, row: T): T {
    read<T>(table).push(row);
    persist(table);
    return row;
  },
  update<T extends { id: string }>(
    table: Table,
    id: string,
    patch: Partial<T>
  ): T | null {
    const rows = read<T>(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return null;
    rows[i] = { ...rows[i], ...patch } as T;
    persist(table);
    return rows[i];
  },
  remove(table: Table, id: string) {
    const rows = read(table);
    const i = rows.findIndex(
      (r) => (r as Record<string, unknown>).id === id
    );
    if (i > -1) {
      rows.splice(i, 1);
      persist(table);
    }
  },
  removeWhere<T>(table: Table, fn: (row: T) => boolean) {
    const rows = read<T>(table);
    const kept = rows.filter((r) => !fn(r));
    if (kept.length !== rows.length) {
      cache.set(table, kept as Record<string, unknown>[]);
      persist(table);
    }
  },
  /** Insert or update by id (used to cache server rows). */
  upsert<T extends { id: string }>(table: Table, row: T): T {
    const rows = read<{ id: string }>(table);
    const i = rows.findIndex((r) => r.id === row.id);
    if (i === -1) rows.push(row);
    else rows[i] = row;
    persist(table);
    return row;
  },
  /** Replace an entire table (server → local cache sync). */
  replace<T extends { id: string }>(table: Table, rows: T[]) {
    cache.set(table, rows as Record<string, unknown>[]);
    persist(table);
  },
};

/** Subscribe a component to table changes. */
export function useDb(tables: Table[]) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const key = tables.join(",");
  useEffect(() => {
    const wanted = new Set(key.split(","));
    const handler = (t: string) => {
      if (wanted.has(t)) force();
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, [key]);
}

/** Wipe all rows (used by account deletion). */
export function resetStorage() {
  cache.clear();
  Object.keys(localStorage)
    .filter((k) => k.startsWith(NS))
    .forEach((k) => localStorage.removeItem(k));
  listeners.forEach((fn) => fn("leads"));
}

export function leadKey(company: string, city: string): string {
  return (
    company.toLowerCase().replace(/[^a-z0-9]/g, "") +
    "|" +
    city.toLowerCase().trim()
  );
}
