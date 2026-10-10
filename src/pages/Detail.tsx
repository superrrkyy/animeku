import { useEffect, useState } from "react";
import {
  AnimeDetail, countdown, dateLabel, epNo, epTitle, fmt, getDetail, seasonLabel, sourceLabel, statusLabel, title,
} from "../api";
import { Card, ErrorBox } from "../components/Card";
import { clearProgress, markAll, markUpTo, toggleEpisode, toggleFav, useFavs, useProgress } from "../store";

export default function Detail({ id }: { id: number }) {
  const [a, setA] = useState<AnimeDetail | null>(null);
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [trailer, setTrailer] = useState(false);
  const favs = useFavs();

  const load = () => { setA(null); setError(""); setTrailer(false); getDetail(id).then(setA).catch(e => setError(e.message)); };
  useEffect(load, [id]);
  useEffect(() => { if (a) document.title = `${title(a)} — AnimeKu`; }, [a]);

  if (error) return <ErrorBox msg={error} retry={load} />;
  if (!a) return (
    <div>
      <div className="skeleton -mx-4 h-48" />
      <div className="-mt-16 flex gap-4"><div className="skeleton h-44 w-32 rounded-2xl" /></div>
      <div className="skeleton mt-4 h-6 w-3/4 rounded" />
      <div className="skeleton mt-2 h-24 rounded-xl" />
    </div>
  );

  const isFav = favs.some(f => f.id === a.id);
  const accent = a.coverImage.color ?? "#ec4899";
  const desc = (a.description ?? "Belum ada sinopsis.").replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "");
  const recs = a.recommendations.nodes.map(n => n.mediaRecommendation).filter(Boolean) as AnimeDetail[];

  // situs streaming resmi (tanpa duplikat)
  const streamLinks = (a.externalLinks ?? []).reduce<{ site: string; url: string }[]>((acc, l) => {
    if (l.type !== "STREAMING" || !l.url || !l.site) return acc;
    if (acc.some(x => x.site === l.site)) return acc;
    acc.push({ site: l.site, url: l.url });
    return acc;
  }, []);

  const info: [string, string][] = [
    ["Format", fmt(a.format)],
    ["Episode", a.episodes ? String(a.episodes) : "?"],
    ["Durasi", a.duration ? `${a.duration} menit` : "-"],
    ["Status", statusLabel(a.status)],
    ["Musim", seasonLabel(a.season, a.seasonYear)],
    ["Mulai Tayang", dateLabel(a.startDate)],
    ["Studio", a.studios.nodes.map(s => s.name).join(", ") || "-"],
    ["Sumber", sourceLabel(a.source)],
  ];

  return (
    <div className="fade-up">
      {/* banner */}
      <div className="relative -mx-4 h-48 overflow-hidden sm:h-64">
        {a.bannerImage
          ? <img src={a.bannerImage} alt="" className="h-full w-full object-cover" />
          : <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${accent}, #0b0614)` }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0614] to-transparent" />
        <button onClick={() => history.length > 1 ? history.back() : (location.hash = "#/")}
          className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1.5 text-sm backdrop-blur">← Kembali</button>
      </div>

      {/* header */}
      <div className="relative -mt-20 flex gap-4">
        <img src={a.coverImage.extraLarge} alt={title(a)} className="w-32 shrink-0 rounded-2xl shadow-2xl ring-2 sm:w-40" style={{ ["--tw-ring-color" as string]: accent }} />
        <div className="flex min-w-0 flex-col justify-end pb-1">
          <h1 className="text-xl font-extrabold leading-tight sm:text-3xl">{title(a)}</h1>
          {a.title.english && a.title.english !== a.title.romaji && <p className="mt-0.5 text-xs text-white/50">{a.title.romaji}</p>}
        </div>
      </div>

      {/* statistik */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat v={a.averageScore ? `⭐ ${(a.averageScore / 10).toFixed(1)}` : "-"} l="Skor" />
        <Stat v={a.popularity.toLocaleString("id-ID")} l="Penonton" />
        <Stat v={`❤️ ${a.favourites.toLocaleString("id-ID")}`} l="Favorit" />
      </div>

      {a.nextAiringEpisode && (
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-pink-500/20 to-violet-600/20 p-3 text-center text-sm ring-1 ring-pink-400/30">
          📡 Episode <b>{a.nextAiringEpisode.episode}</b> tayang dalam <b>{countdown(a.nextAiringEpisode.airingAt)}</b>
        </div>
      )}

      {/* aksi */}
      <div className="mt-3 flex gap-2">
        <button onClick={() => toggleFav(a)}
          className={`flex-1 rounded-2xl py-3 font-semibold transition active:scale-95 ${isFav ? "bg-white/10 ring-1 ring-pink-400" : "bg-gradient-to-r from-pink-500 to-violet-600"}`}>
          {isFav ? "❤️ Di Favorit" : "🤍 Tambah Favorit"}
        </button>
        {a.trailer?.site === "youtube" && (
          <button onClick={() => setTrailer(t => !t)} className="flex-1 rounded-2xl bg-white/10 py-3 font-semibold transition active:scale-95">
            {trailer ? "✕ Tutup Trailer" : "▶ Trailer"}
          </button>
        )}
      </div>

      {trailer && a.trailer && (
        <div className="mt-3 aspect-video overflow-hidden rounded-2xl">
          <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${a.trailer.id}?autoplay=1`}
            title="Trailer" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      )}

      {/* genre */}
      <div className="mt-4 flex flex-wrap gap-2">
        {a.genres.map(g => <span key={g} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">{g}</span>)}
      </div>

      {/* tonton di situs resmi */}
      {streamLinks.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-bold">▶️ Tonton di</h2>
          <div className="flex flex-wrap gap-2">
            {streamLinks.map(l => (
              <a key={l.site + l.url} href={l.url} target="_blank" rel="noopener"
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold transition active:scale-95">
                {l.site} ↗
              </a>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/40">
            Link menuju <b>situs streaming resmi</b>. Sebagian perlu berlangganan atau belum tersedia di Indonesia.
          </p>
        </section>
      )}

      {/* daftar episode + pelacak progres */}
      <Episodes a={a} />

      {/* sinopsis */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">📖 Sinopsis</h2>
        <p className={`whitespace-pre-line text-sm leading-relaxed text-white/75 ${more ? "" : "line-clamp-[6]"}`}
          style={more ? {} : { display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{desc}</p>
        {desc.length > 300 && (
          <button onClick={() => setMore(m => !m)} className="mt-1 text-sm font-semibold text-pink-400">{more ? "Tutup" : "Selengkapnya"}</button>
        )}
      </section>

      {/* info */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-2 text-lg font-bold">ℹ️ Informasi</h2>
        {info.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-white/5 py-2 text-sm last:border-0">
            <span className="text-white/50">{k}</span><span className="text-right font-medium">{v}</span>
          </div>
        ))}
      </section>

      {/* karakter */}
      {a.characters.edges.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">👥 Karakter</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {a.characters.edges.map(c => (
              <div key={c.node.id} className="w-20 shrink-0 text-center">
                <img src={c.node.image.medium} alt={c.node.name.full} loading="lazy" className="mx-auto h-20 w-20 rounded-full object-cover ring-2 ring-white/10" />
                <p className="mt-1.5 line-clamp-2 text-xs font-medium">{c.node.name.full}</p>
                <p className="text-[10px] text-white/40">{c.role === "MAIN" ? "Utama" : c.role === "SUPPORTING" ? "Pendukung" : "Figuran"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* rekomendasi */}
      {recs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-bold">✨ Mungkin Kamu Suka</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {recs.map(r => <div key={r.id} className="w-[30%] min-w-[110px] max-w-[160px] shrink-0"><Card a={r} /></div>)}
          </div>
        </section>
      )}

      <p className="mt-6 text-center text-xs text-white/30">Sinopsis dari AniList (bahasa Inggris)</p>
    </div>
  );
}

/**
 * Daftar episode + pelacak progres.
 * AnimeKu TIDAK menyimpan/memutar video — setiap episode hanya menautkan ke
 * situs streaming resmi yang datanya diberikan oleh AniList.
 */
function Episodes({ a }: { a: AnimeDetail }) {
  const p = useProgress(a.id);
  const watched = new Set(p?.watched ?? []);
  const [showAll, setShowAll] = useState(false);

  const meta = { id: a.id, title: title(a), cover: a.coverImage.large, total: a.episodes ?? 0 };

  const eps = (a.streamingEpisodes ?? [])
    .map((e, i) => ({ n: epNo(e.title, i + 1), t: epTitle(e.title), thumb: e.thumbnail, url: e.url, site: e.site }))
    .filter((e): e is { n: number; t: string; thumb: string | null; url: string; site: string | null } => !!e.url)
    .sort((x, y) => x.n - y.n)
    .filter((e, i, arr) => arr.findIndex(z => z.n === e.n) === i);

  const lastStream = eps.length ? eps[eps.length - 1].n : 0;
  const total = a.episodes && a.episodes > 0
    ? a.episodes
    : lastStream || (a.nextAiringEpisode ? Math.max(1, a.nextAiringEpisode.episode - 1) : 12);
  const count = watched.size;
  const pct = Math.min(100, Math.round((count / Math.max(1, total)) * 100));

  const allNums = Array.from({ length: Math.max(total, lastStream) }, (_, i) => i + 1);
  const nextN = allNums.find(n => !watched.has(n));
  const nextLink = nextN ? eps.find(e => e.n === nextN) : undefined;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">📺 Episode</h2>
        <span className="text-xs text-white/50">{count} / {total} ditonton</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-600 transition-all duration-500"
          style={{ width: `${pct}%` }} />
      </div>

      {nextN != null && (
        <div className="mt-3 flex gap-2">
          {nextLink && (
            <a href={nextLink.url} target="_blank" rel="noopener"
              className="flex-1 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 py-2.5 text-center text-sm font-semibold transition active:scale-95">
              ▶ Nonton Episode {nextN}
            </a>
          )}
          <button onClick={() => markUpTo(meta, nextN)}
            className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition active:scale-95">
            ✓ s/d Ep {nextN}
          </button>
        </div>
      )}

      {eps.length > 0 ? (
        <>
          <div className="mt-3 space-y-2">
            {(showAll ? eps : eps.slice(0, 10)).map(e => {
              const done = watched.has(e.n);
              return (
                <div key={e.n}
                  className={`flex items-center gap-3 rounded-xl border p-2 transition ${done ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-black/20"}`}>
                  <a href={e.url} target="_blank" rel="noopener" className="relative block w-24 shrink-0">
                    {e.thumb
                      ? <img src={e.thumb} alt="" loading="lazy" className="aspect-video w-24 rounded-lg object-cover" />
                      : <div className="grid aspect-video w-24 place-items-center rounded-lg bg-white/10 text-lg">▶</div>}
                    {done && <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/55 text-lg">✅</span>}
                  </a>
                  <a href={e.url} target="_blank" rel="noopener" className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Episode {e.n}</p>
                    <p className="line-clamp-2 text-xs text-white/60">{e.t || `Buka di ${e.site ?? "situs resmi"}`}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-white/35">{e.site}</p>
                  </a>
                  <button onClick={() => toggleEpisode(meta, e.n)} aria-label={`Episode ${e.n}`}
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base transition active:scale-90 ${done ? "bg-emerald-500 font-black text-black" : "bg-white/10"}`}>
                    {done ? "✓" : "○"}
                  </button>
                </div>
              );
            })}
          </div>

          {eps.length > 10 && (
            <button onClick={() => setShowAll(s => !s)}
              className="mt-3 w-full rounded-xl bg-white/5 py-2.5 text-sm font-semibold transition active:scale-95">
              {showAll ? "Sembunyikan" : `Tampilkan semua ${eps.length} episode`}
            </button>
          )}

          <p className="mt-2.5 text-[11px] leading-relaxed text-white/40">
            Setiap episode membuka <b>situs streaming resmi</b> (Crunchyroll, Netflix, Bilibili TV, dll).
            AnimeKu tidak menyimpan maupun menayangkan video apa pun.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed text-white/50">
            AniList belum menyediakan link episode untuk anime ini.
            Kamu tetap bisa menandai progres nonton secara manual 👇
          </p>
          <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {allNums.slice(0, 300).map(n => {
              const done = watched.has(n);
              return (
                <button key={n} onClick={() => toggleEpisode(meta, n)}
                  className={`aspect-square rounded-lg text-xs font-bold transition active:scale-90 ${done ? "bg-emerald-500 text-black" : "bg-white/10 text-white/70"}`}>
                  {n}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={() => markAll(meta, allNums, true)}
          className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold transition active:scale-95">
          Tandai semua
        </button>
        <button onClick={() => clearProgress(a.id)}
          className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold transition active:scale-95">
          Reset progres
        </button>
      </div>
    </section>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 py-2.5">
      <div className="text-sm font-bold">{v}</div>
      <div className="text-[11px] text-white/50">{l}</div>
    </div>
  );
}
