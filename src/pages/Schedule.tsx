import { useEffect, useMemo, useState } from "react";
import { Airing, clockLabel, getSchedule, title } from "../api";
import { ErrorBox } from "../components/Card";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function startOfDay(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

export default function Schedule() {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => startOfDay(i)), []);
  const [active, setActive] = useState(0);
  const [items, setItems] = useState<Airing[] | null>(null);
  const [error, setError] = useState("");
  const [, tick] = useState(0);

  const load = () => {
    setItems(null); setError("");
    const from = Math.floor(days[active].getTime() / 1000) - 1;
    const to = from + 86400 + 1;
    getSchedule(from, to).then(setItems).catch(e => setError(e.message));
  };
  useEffect(load, [active, days]);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  const now = Date.now() / 1000;

  return (
    <div>
      <h1 className="text-2xl font-extrabold">📅 Jadwal Tayang</h1>
      <p className="text-sm text-white/50">Waktu sesuai zona waktu perangkatmu</p>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {days.map((d, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`min-w-[68px] shrink-0 rounded-2xl border px-3 py-2 text-center transition ${active === i ? "border-pink-400 bg-gradient-to-b from-pink-500 to-violet-600" : "border-white/10 bg-white/5"}`}>
            <div className="text-xs opacity-80">{i === 0 ? "Hari ini" : i === 1 ? "Besok" : HARI[d.getDay()]}</div>
            <div className="text-lg font-bold">{d.getDate()}</div>
          </button>
        ))}
      </div>

      {error && <ErrorBox msg={error} retry={load} />}

      <div className="mt-5 space-y-3">
        {!items && !error && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        {items && items.length === 0 && <p className="mt-10 text-center text-white/50">Tidak ada jadwal 😴</p>}
        {items?.map(s => {
          const aired = s.airingAt <= now;
          return (
            <a key={s.id} href={`#/anime/${s.media.id}`}
              className={`fade-up flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5 transition hover:border-pink-400/60 ${aired ? "opacity-60" : ""}`}>
              <img src={s.media.coverImage.large} alt="" loading="lazy" className="h-20 w-14 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1 py-0.5">
                <h3 className="line-clamp-2 text-sm font-semibold">{title(s.media)}</h3>
                <p className="mt-1 text-xs text-white/60">Episode {s.episode}{s.media.episodes ? ` / ${s.media.episodes}` : ""}</p>
                <p className="mt-0.5 text-xs text-white/40">{s.media.genres.slice(0, 2).join(" • ")}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end justify-center pr-1">
                <span className="text-lg font-bold">{clockLabel(s.airingAt)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${aired ? "bg-white/10" : "bg-pink-500/90"}`}>
                  {aired ? "Sudah tayang" : "Akan tayang"}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
