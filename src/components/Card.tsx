import { Anime, countdown, fmt, title } from "../api";
import { toggleFav, useFavs } from "../store";

export function Card({ a, rank }: { a: Anime; rank?: number }) {
  const favs = useFavs();
  const isFav = favs.some(f => f.id === a.id);
  const accent = a.coverImage.color ?? "#a78bfa";

  return (
    <a href={`#/anime/${a.id}`} className="group block w-full fade-up">
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-[#1a1229] shadow-lg ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-2" style={{ ["--tw-ring-color" as string]: accent }}>
        <img src={a.coverImage.large} alt={title(a)} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {rank && (
          <span className="absolute left-0 top-0 rounded-br-2xl bg-gradient-to-br from-pink-500 to-violet-600 px-2.5 py-1 text-sm font-black">#{rank}</span>
        )}
        {a.averageScore && (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold backdrop-blur">⭐ {(a.averageScore / 10).toFixed(1)}</span>
        )}
        <button
          onClick={e => { e.preventDefault(); toggleFav(a); }}
          className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-base backdrop-blur transition active:scale-90"
          aria-label="Favorit"
        >
          {isFav ? "❤️" : "🤍"}
        </button>
        {a.nextAiringEpisode && (
          <span className="absolute bottom-2.5 left-2 rounded-full bg-pink-500/90 px-2 py-0.5 text-[10px] font-bold shadow">
            Ep {a.nextAiringEpisode.episode} · {countdown(a.nextAiringEpisode.airingAt, true)}
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{title(a)}</h3>
      <p className="text-xs text-white/50">{fmt(a.format)}{a.episodes ? ` • ${a.episodes} eps` : ""}</p>
    </a>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-full">
      <div className="skeleton aspect-[2/3] rounded-2xl" />
      <div className="skeleton mt-2 h-3 w-4/5 rounded" />
      <div className="skeleton mt-1.5 h-3 w-1/2 rounded" />
    </div>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">{children}</div>;
}

export function Row({ title: t, items, ranked }: { title: string; items: Anime[] | null; ranked?: boolean }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold">{t}</h2>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {(items ?? Array.from({ length: 6 })).map((a, i) => (
          <div key={a ? (a as Anime).id : i} className="w-[30%] min-w-[110px] max-w-[160px] shrink-0">
            {a ? <Card a={a as Anime} rank={ranked ? i + 1 : undefined} /> : <CardSkeleton />}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ErrorBox({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <p className="mb-3">😢 {msg}</p>
      <button onClick={retry} className="rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-2 font-semibold">Coba lagi</button>
    </div>
  );
}
