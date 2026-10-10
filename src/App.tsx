import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Schedule from "./pages/Schedule";
import Detail from "./pages/Detail";
import { Card, Grid } from "./components/Card";
import { useFavs } from "./store";

// Router sederhana berbasis hash (#/...) agar aman di GitHub Pages
function useRoute() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const on = () => { setHash(location.hash || "#/"); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash.slice(1);
}

const NAV = [
  { path: "/", icon: "🏠", label: "Beranda" },
  { path: "/jelajah", icon: "🔍", label: "Jelajah" },
  { path: "/jadwal", icon: "📅", label: "Jadwal" },
  { path: "/favorit", icon: "❤️", label: "Favorit" },
];

export default function App() {
  const route = useRoute();
  const detail = route.match(/^\/anime\/(\d+)/);

  useEffect(() => {
    if (!detail) document.title = "AnimeKu — Katalog Anime";
  }, [route]);

  let page;
  if (detail) page = <Detail id={+detail[1]} />;
  else if (route === "/jelajah") page = <Browse />;
  else if (route === "/jadwal") page = <Schedule />;
  else if (route === "/favorit") page = <Favorites />;
  else page = <Home />;

  return (
    <div className="min-h-screen pb-24">
      {/* glow latar */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(600px_300px_at_0%_0%,#ec489922,transparent),radial-gradient(600px_300px_at_100%_0%,#8b5cf622,transparent)]" />

      {!detail && (
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b0614]/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a href="#/" className="text-xl font-black tracking-tight">▶ <span className="grad-text">AnimeKu</span></a>
            <nav className="hidden gap-1 sm:flex">
              {NAV.map(n => (
                <a key={n.path} href={`#${n.path}`}
                  className={`rounded-full px-4 py-1.5 text-sm transition ${route === n.path ? "bg-white/10 font-semibold" : "text-white/60 hover:text-white"}`}>
                  {n.label}
                </a>
              ))}
            </nav>
            <a href="#/jelajah" className="text-lg sm:hidden" aria-label="Cari">🔍</a>
          </div>
        </header>
      )}

      <main key={route} className={`mx-auto max-w-5xl px-4 ${detail ? "" : "pt-4"}`}>{page}</main>

      <footer className="mx-auto mt-12 max-w-5xl px-4 text-center text-xs text-white/40">
        Data: <a href="https://anilist.co" target="_blank" rel="noopener" className="underline">AniList</a> • Dibuat dengan 💜 oleh{" "}
        <a href="https://superrrkyy.github.io/" target="_blank" rel="noopener" className="font-semibold text-pink-400">AXRYZURE</a>
      </footer>

      {/* navigasi bawah (HP) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b0614]/90 backdrop-blur-lg sm:hidden">
        <div className="grid grid-cols-4">
          {NAV.map(n => {
            const on = route === n.path;
            return (
              <a key={n.path} href={`#${n.path}`} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${on ? "text-pink-400" : "text-white/50"}`}>
                <span className={`text-xl transition ${on ? "scale-110" : "grayscale"}`}>{n.icon}</span>
                {n.label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Favorites() {
  const favs = useFavs();
  return (
    <div>
      <h1 className="text-2xl font-extrabold">❤️ Favoritku</h1>
      <p className="text-sm text-white/50">{favs.length} anime tersimpan di perangkat ini</p>
      {favs.length === 0 ? (
        <div className="mt-16 text-center">
          <div className="text-6xl">💔</div>
          <p className="mt-3 text-white/60">Belum ada favorit.</p>
          <p className="text-sm text-white/40">Ketuk 🤍 pada anime untuk menyimpannya.</p>
          <a href="#/" className="mt-5 inline-block rounded-full bg-gradient-to-r from-pink-500 to-violet-600 px-6 py-2.5 font-semibold">Cari Anime</a>
        </div>
      ) : (
        <div className="mt-5"><Grid>{favs.map(a => <Card key={a.id} a={a} />)}</Grid></div>
      )}
    </div>
  );
}
