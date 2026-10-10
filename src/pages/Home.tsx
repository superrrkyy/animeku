import { useEffect, useState } from "react";
import { Anime, getHome, seasonLabel, currentSeason, title, statusLabel } from "../api";
import { ContinueRow, ErrorBox, Row } from "../components/Card";

type Data = Awaited<ReturnType<typeof getHome>>;

export default function Home() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);

  const load = () => { setError(""); getHome().then(setData).catch(e => setError(e.message)); };
  useEffect(load, []);

  const heroes = (data?.trending ?? []).filter(a => a.bannerImage).slice(0, 5);
  useEffect(() => {
    if (!heroes.length) return;
    const t = setInterval(() => setSlide(s => (s + 1) % heroes.length), 6000);
    return () => clearInterval(t);
  }, [heroes.length]);

  if (error) return <ErrorBox msg={error} retry={load} />;
  const { season, year } = currentSeason();

  return (
    <div>
      {/* Hero slider */}
      <div className="relative -mx-4 h-[270px] overflow-hidden sm:mx-0 sm:rounded-3xl">
        {heroes.length === 0 && <div className="skeleton h-full w-full" />}
        {heroes.map((a, i) => <Hero key={a.id} a={a} active={i === slide} />)}
        {heroes.length > 1 && (
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {heroes.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-6 bg-pink-400" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>

      <ContinueRow />

      <Row title="🔥 Sedang Trending" items={data?.trending ?? null} />
      <Row title={`🍁 Populer ${seasonLabel(season, year)}`} items={data?.seasonal ?? null} />
      <Row title="🏆 Rating Tertinggi" items={data?.top ?? null} ranked />
      <Row title="🗓️ Segera Tayang" items={data?.upcoming ?? null} />
    </div>
  );
}

function Hero({ a, active }: { a: Anime; active: boolean }) {
  return (
    <a href={`#/anime/${a.id}`} className={`absolute inset-0 transition-opacity duration-1000 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <img src={a.bannerImage!} alt="" className={`h-full w-full object-cover transition-transform duration-[6000ms] ${active ? "scale-110" : "scale-100"}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0614] via-[#0b0614]/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <span className="rounded-full bg-pink-500/90 px-2.5 py-0.5 text-[11px] font-bold">🔥 TRENDING • {statusLabel(a.status)}</span>
        <h2 className="mt-2 line-clamp-2 text-2xl font-extrabold leading-tight drop-shadow-lg">{title(a)}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/80">
          {a.averageScore && <span>⭐ {(a.averageScore / 10).toFixed(1)}</span>}
          {a.genres.slice(0, 3).map(g => <span key={g} className="rounded-full border border-white/20 px-2 py-0.5">{g}</span>)}
        </div>
      </div>
    </a>
  );
}
