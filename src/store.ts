// Favorit + progres nonton tersimpan di localStorage
import { useSyncExternalStore } from "react";
import type { Anime } from "./api";

const KEY = "animeku_favs";
const PKEY = "animeku_progress";

let favs: Anime[] = (() => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
})();

export interface ProgressItem {
  id: number;
  title: string;
  cover: string;
  total: number;
  watched: number[];
  updated: number;
}

let prog: Record<string, ProgressItem> = (() => {
  try { return JSON.parse(localStorage.getItem(PKEY) ?? "{}"); } catch { return {}; }
})();

const listeners = new Set<() => void>();

function emit() {
  localStorage.setItem(KEY, JSON.stringify(favs));
  listeners.forEach(l => l());
}

function emitProg() {
  localStorage.setItem(PKEY, JSON.stringify(prog));
  listeners.forEach(l => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

// ---------- Favorit ----------
export function toggleFav(a: Anime) {
  const has = favs.some(f => f.id === a.id);
  if (has) favs = favs.filter(f => f.id !== a.id);
  else {
    // simpan data ringkas saja
    const { id, title, coverImage, bannerImage, averageScore, episodes, format, status, season, seasonYear, genres, nextAiringEpisode } = a;
    favs = [{ id, title, coverImage, bannerImage, averageScore, episodes, format, status, season, seasonYear, genres, nextAiringEpisode }, ...favs];
  }
  emit();
  return !has;
}

export function useFavs() {
  return useSyncExternalStore(subscribe, () => favs);
}

// ---------- Progres nonton ----------
export function useProgress(id: number): ProgressItem | null {
  return useSyncExternalStore(subscribe, () => prog[String(id)] ?? null);
}

export function useProgressAll() {
  return useSyncExternalStore(subscribe, () => prog);
}

type Meta = { id: number; title: string; cover: string; total: number };

function write(meta: Meta, watched: number[], updated = Date.now()) {
  const k = String(meta.id);
  const cur = prog[k];
  const list = Array.from(new Set(watched)).filter(n => n > 0).sort((a, b) => a - b);
  const next: ProgressItem = {
    id: meta.id,
    title: meta.title,
    cover: meta.cover,
    total: Math.max(cur?.total ?? 0, meta.total ?? 0, ...list),
    watched: list,
    updated,
  };
  if (!list.length) {
    const rest = { ...prog };
    delete rest[k];
    prog = rest;
  } else {
    prog = { ...prog, [k]: next };
  }
  emitProg();
}

/** centang / hilangkan centang satu episode */
export function toggleEpisode(meta: Meta, ep: number) {
  const cur = prog[String(meta.id)]?.watched ?? [];
  const has = cur.includes(ep);
  write(meta, has ? cur.filter(e => e !== ep) : [...cur, ep]);
}

/** tandai semua episode (on = true) atau kosongkan (on = false) */
export function markAll(meta: Meta, eps: number[], on: boolean) {
  const cur = prog[String(meta.id)]?.watched ?? [];
  write(meta, on ? [...cur, ...eps] : cur.filter(e => !eps.includes(e)));
}

/** tandai 1..n sudah ditonton */
export function markUpTo(meta: Meta, n: number) {
  const cur = prog[String(meta.id)]?.watched ?? [];
  const add = Array.from({ length: n }, (_, i) => i + 1);
  write(meta, [...cur, ...add]);
}

export function clearProgress(id: number) {
  if (!prog[String(id)]) return;
  const rest = { ...prog };
  delete rest[String(id)];
  prog = rest;
  emitProg();
}

/** daftar anime yang punya progres, terbaru di atas */
export function progressList(): ProgressItem[] {
  return Object.values(prog).sort((a, b) => b.updated - a.updated);
}
