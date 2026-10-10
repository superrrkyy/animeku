// Favorit tersimpan di localStorage + hook React
import { useSyncExternalStore } from "react";
import type { Anime } from "./api";

const KEY = "animeku_favs";
let favs: Anime[] = (() => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
})();
const listeners = new Set<() => void>();

function emit() {
  localStorage.setItem(KEY, JSON.stringify(favs));
  listeners.forEach(l => l());
}

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
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => favs
  );
}
