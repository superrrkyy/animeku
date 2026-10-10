// Data anime dari AniList GraphQL API (gratis, tanpa API key)
const URL = "https://graphql.anilist.co";

export interface Anime {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { extraLarge: string; large: string; color: string | null };
  bannerImage: string | null;
  averageScore: number | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  nextAiringEpisode: { episode: number; airingAt: number } | null;
}

export interface AnimeDetail extends Anime {
  description: string | null;
  duration: number | null;
  popularity: number;
  favourites: number;
  source: string | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  studios: { nodes: { name: string }[] };
  trailer: { id: string; site: string } | null;
  characters: { edges: { role: string; node: { id: number; name: { full: string }; image: { medium: string } } }[] };
  recommendations: { nodes: { mediaRecommendation: Anime | null }[] };
  // link episode ke situs streaming RESMI (Crunchyroll, Netflix, dst) — bukan video di server kita
  streamingEpisodes: { title: string | null; thumbnail: string | null; url: string | null; site: string | null }[] | null;
  externalLinks: { site: string; url: string; type: string | null }[] | null;
}

export interface Airing {
  id: number;
  episode: number;
  airingAt: number;
  media: Anime;
}

const FIELDS = `
  id title { romaji english } coverImage { extraLarge large color } bannerImage
  averageScore episodes format status season seasonYear genres
  nextAiringEpisode { episode airingAt }
`;

// cache sederhana agar tidak memanggil API berulang
const cache = new Map<string, unknown>();

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const key = query + JSON.stringify(variables);
  if (cache.has(key)) return cache.get(key) as T;
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 429) throw new Error("Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.");
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "Gagal memuat data");
  cache.set(key, json.data);
  return json.data as T;
}

export function currentSeason() {
  const d = new Date();
  const m = d.getMonth();
  const season = m < 3 ? "WINTER" : m < 6 ? "SPRING" : m < 9 ? "SUMMER" : "FALL";
  return { season, year: d.getFullYear() };
}

export async function getHome() {
  const { season, year } = currentSeason();
  const q = `query ($season: MediaSeason, $year: Int) {
    trending: Page(perPage: 12) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${FIELDS} } }
    seasonal: Page(perPage: 12) { media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC, isAdult: false) { ${FIELDS} } }
    top: Page(perPage: 12) { media(type: ANIME, sort: SCORE_DESC, isAdult: false) { ${FIELDS} } }
    upcoming: Page(perPage: 12) { media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) { ${FIELDS} } }
  }`;
  type P = { media: Anime[] };
  const d = await gql<{ trending: P; seasonal: P; top: P; upcoming: P }>(q, { season, year });
  return { trending: d.trending.media, seasonal: d.seasonal.media, top: d.top.media, upcoming: d.upcoming.media };
}

export async function searchAnime(search: string, genre: string, page = 1) {
  const q = `query ($search: String, $genre: String, $page: Int) {
    Page(page: $page, perPage: 24) {
      pageInfo { hasNextPage }
      media(type: ANIME, search: $search, genre: $genre, isAdult: false, sort: ${search ? "SEARCH_MATCH" : "POPULARITY_DESC"}) { ${FIELDS} }
    }
  }`;
  const d = await gql<{ Page: { pageInfo: { hasNextPage: boolean }; media: Anime[] } }>(q, {
    search: search || undefined, genre: genre || undefined, page,
  });
  return { items: d.Page.media, hasNext: d.Page.pageInfo.hasNextPage };
}

export async function getDetail(id: number) {
  const q = `query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ${FIELDS}
      description(asHtml: false) duration popularity favourites source
      startDate { year month day }
      studios(isMain: true) { nodes { name } }
      trailer { id site }
      characters(perPage: 10, sort: [ROLE, RELEVANCE]) { edges { role node { id name { full } image { medium } } } }
      recommendations(perPage: 10, sort: RATING_DESC) { nodes { mediaRecommendation { ${FIELDS} } } }
      streamingEpisodes { title thumbnail url site }
      externalLinks { site url type }
    }
  }`;
  const d = await gql<{ Media: AnimeDetail }>(q, { id });
  return d.Media;
}

export async function getSchedule(from: number, to: number) {
  const q = `query ($from: Int, $to: Int, $page: Int) {
    Page(page: $page, perPage: 50) {
      pageInfo { hasNextPage }
      airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
        id episode airingAt media { ${FIELDS} isAdult countryOfOrigin }
      }
    }
  }`;
  type R = { Page: { pageInfo: { hasNextPage: boolean }; airingSchedules: (Airing & { media: { isAdult: boolean; countryOfOrigin: string } })[] } };
  const all: Airing[] = [];
  for (let page = 1; page <= 4; page++) {
    const d = await gql<R>(q, { from, to, page });
    all.push(...d.Page.airingSchedules.filter(a => !a.media.isAdult && a.media.countryOfOrigin === "JP"));
    if (!d.Page.pageInfo.hasNextPage) break;
  }
  return all;
}

// ---------- Helper tampilan ----------
export const title = (a: Anime) => a.title.english || a.title.romaji;

// "Episode 12 - Judulnya" -> 12
export function epNo(t: string | null, fallback = 0): number {
  const m = /episode\s*(\d+)/i.exec(t ?? "");
  return m ? +m[1] : fallback;
}

// "Episode 12 - Judulnya" -> "Judulnya"
export function epTitle(t: string | null): string {
  return (t ?? "").replace(/^\s*episode\s*\d+\s*[-–:•]?\s*/i, "").trim();
}

export const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mecha", "Music",
  "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
];

const FORMAT: Record<string, string> = {
  TV: "TV", TV_SHORT: "TV Pendek", MOVIE: "Film", SPECIAL: "Spesial", OVA: "OVA", ONA: "ONA", MUSIC: "Musik",
};
const STATUS: Record<string, string> = {
  FINISHED: "Tamat", RELEASING: "Sedang Tayang", NOT_YET_RELEASED: "Segera Tayang", CANCELLED: "Dibatalkan", HIATUS: "Hiatus",
};
const SEASON: Record<string, string> = { WINTER: "Musim Dingin", SPRING: "Musim Semi", SUMMER: "Musim Panas", FALL: "Musim Gugur" };
const SOURCE: Record<string, string> = {
  ORIGINAL: "Original", MANGA: "Manga", LIGHT_NOVEL: "Light Novel", VISUAL_NOVEL: "Visual Novel",
  VIDEO_GAME: "Game", NOVEL: "Novel", WEB_NOVEL: "Web Novel", OTHER: "Lainnya",
};
export const fmt = (f: string | null) => (f ? FORMAT[f] ?? f : "-");
export const statusLabel = (s: string | null) => (s ? STATUS[s] ?? s : "-");
export const seasonLabel = (s: string | null, y: number | null) => (s ? `${SEASON[s] ?? s} ${y ?? ""}` : y ? String(y) : "-");
export const sourceLabel = (s: string | null) => (s ? SOURCE[s] ?? s : "-");

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const dateLabel = (d: { year: number | null; month: number | null; day: number | null }) =>
  d.year ? [d.day, d.month ? BULAN[d.month - 1] : null, d.year].filter(Boolean).join(" ") : "-";

export function countdown(airingAt: number, short = false) {
  const s = Math.max(0, airingAt - Math.floor(Date.now() / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (short) return d > 0 ? `${d}hr` : h > 0 ? `${h}j` : `${m}m`;
  return d > 0 ? `${d} hr ${h} j` : h > 0 ? `${h} j ${m} m` : `${m} m`;
}

export const clockLabel = (t: number) =>
  new Date(t * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
