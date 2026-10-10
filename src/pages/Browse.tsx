import { useEffect, useState } from "react";
import { Anime, GENRES, searchAnime } from "../api";
import { Card, CardSkeleton, ErrorBox, Grid } from "../components/Card";

export default function Browse() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [items, setItems] = useState<Anime[] | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // debounce pencarian
  useEffect(() => { const t = setTimeout(() => setQuery(q.trim()), 500); return () => clearTimeout(t); }, [q]);

  const load = () => {
    setItems(null); setError(""); setPage(1);
    searchAnime(query, genre, 1).then(r => { setItems(r.items); setHasNext(r.hasNext); }).catch(e => setError(e.message));
  };
  useEffect(load, [query, genre]);

  const more = () => {
    setLoadingMore(true);
    searchAnime(query, genre, page + 1)
      .then(r => { setItems(prev => [...(prev ?? []), ...r.items.filter(x => !prev?.some(p => p.id === x.id))]); setHasNext(r.hasNext); setPage(page + 1); })
      .catch(e => setError(e.message))
      .finally(() => setLoadingMore(false));
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold">🔍 Jelajahi Anime</h1>
      <div className="relative mt-4">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Cari judul anime..."
          autoFocus
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-4 pr-10 outline-none placeholder:text-white/40 focus:border-pink-400"
        />
        {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50" aria-label="Hapus">✕</button>}
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {["", ...GENRES].map(g => (
          <button key={g || "all"} onClick={() => setGenre(g)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${genre === g ? "border-pink-400 bg-pink-500 font-semibold" : "border-white/10 bg-white/5 text-white/70"}`}>
            {g || "Semua"}
          </button>
        ))}
      </div>

      {error && <ErrorBox msg={error} retry={load} />}

      <div className="mt-5">
        {items && items.length === 0 && <p className="mt-10 text-center text-white/50">Anime tidak ditemukan 😅</p>}
        <Grid>
          {(items ?? Array.from({ length: 12 })).map((a, i) =>
            a ? <Card key={(a as Anime).id} a={a as Anime} /> : <CardSkeleton key={i} />)}
        </Grid>
        {hasNext && items && (
          <button onClick={more} disabled={loadingMore}
            className="mx-auto mt-6 block rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold transition hover:border-pink-400 disabled:opacity-50">
            {loadingMore ? "Memuat..." : "Muat lebih banyak"}
          </button>
        )}
      </div>
    </div>
  );
}
