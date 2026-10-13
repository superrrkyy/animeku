/**
 * Unit test untuk modul AnimeKu (AniList GraphQL + pemutar YouTube kanal resmi).
 * fetch selalu di-mock; tidak ada permintaan jaringan sungguhan.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  countdown,
  currentSeason,
  dateLabel,
  epNo,
  epTitle,
  findOfficialEpisode,
  fmt,
  seasonLabel,
  sourceLabel,
  statusLabel,
  title,
  youtubeSearch,
  type Anime,
} from "../api";

const okJson = (data: unknown) =>
  ({ ok: true, status: 200, json: async () => data }) as unknown as Response;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("helper episode", () => {
  it("epNo() mengambil nomor episode dari judul", () => {
    expect(epNo("Episode 12 - Judulnya")).toBe(12);
    expect(epNo("EPISODE 07")).toBe(7);
    expect(epNo("Trailer")).toBe(0);
    expect(epNo(null, 5)).toBe(5);
    expect(epNo("")).toBe(0);
  });

  it("epTitle() membuang awalan 'Episode N'", () => {
    expect(epTitle("Episode 12 - Judulnya")).toBe("Judulnya");
    expect(epTitle("Episode 3: Awal Mula")).toBe("Awal Mula");
    expect(epTitle("Episode 1")).toBe("");
    expect(epTitle(null)).toBe("");
  });
});

describe("label tampilan", () => {
  it("fmt() menerjemahkan format", () => {
    expect(fmt("TV")).toBe("TV");
    expect(fmt("MOVIE")).toBe("Film");
    expect(fmt("OVA")).toBe("OVA");
    expect(fmt(null)).toBe("-");
    expect(fmt("UNKNOWN_FORMAT")).toBe("UNKNOWN_FORMAT");
  });

  it("statusLabel() menerjemahkan status", () => {
    expect(statusLabel("RELEASING")).toBe("Sedang Tayang");
    expect(statusLabel("FINISHED")).toBe("Tamat");
    expect(statusLabel("NOT_YET_RELEASED")).toBe("Segera Tayang");
    expect(statusLabel(null)).toBe("-");
  });

  it("seasonLabel() menggabungkan musim & tahun", () => {
    expect(seasonLabel("FALL", 2026)).toBe("Musim Gugur 2026");
    expect(seasonLabel("WINTER", 2025)).toBe("Musim Dingin 2025");
    expect(seasonLabel(null, 2026)).toBe("2026");
    expect(seasonLabel(null, null)).toBe("-");
  });

  it("sourceLabel() menerjemahkan sumber materi", () => {
    expect(sourceLabel("MANGA")).toBe("Manga");
    expect(sourceLabel("LIGHT_NOVEL")).toBe("Light Novel");
    expect(sourceLabel(null)).toBe("-");
  });

  it("title() memilih judul Inggris bila ada", () => {
    const base = { title: { romaji: "Romaji", english: null } } as Anime;
    expect(title(base)).toBe("Romaji");
    expect(title({ ...base, title: { romaji: "Romaji", english: "English" } })).toBe("English");
  });

  it("dateLabel() memformat tanggal mulai", () => {
    expect(dateLabel({ year: 2026, month: 10, day: 13 })).toBe("13 Okt 2026");
    expect(dateLabel({ year: 2026, month: null, day: null })).toBe("2026");
    expect(dateLabel({ year: null, month: 1, day: 1 })).toBe("-");
  });
});

describe("currentSeason()", () => {
  const at = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  };

  it("Januari–Maret = WINTER", () => {
    at("2026-01-15T00:00:00Z");
    expect(currentSeason()).toEqual({ season: "WINTER", year: 2026 });
  });

  it("April–Juni = SPRING", () => {
    at("2026-04-01T00:00:00Z");
    expect(currentSeason().season).toBe("SPRING");
  });

  it("Juli–September = SUMMER", () => {
    at("2026-07-20T00:00:00Z");
    expect(currentSeason().season).toBe("SUMMER");
  });

  it("Oktober–Desember = FALL", () => {
    at("2026-10-13T00:00:00Z");
    expect(currentSeason()).toEqual({ season: "FALL", year: 2026 });
  });
});

describe("pemutar episode — hanya kanal resmi", () => {
  beforeEach(() => vi.restoreAllMocks());

  const items = (list: { id: string; title: string; channel: string }[]) =>
    list.map(v => ({
      id: { videoId: v.id },
      snippet: { title: v.title, channelTitle: v.channel },
    }));

  it("memilih video dari kanal resmi (Muse Indonesia)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okJson({
          items: items([
            { id: "official1", title: "Anime Uji Episode 12 Sub Indo", channel: "Muse Indonesia" },
            { id: "bajakan", title: "Anime Uji Episode 12", channel: "Fan Reupload 123" },
          ]),
        }),
      ),
    );

    const v = await findOfficialEpisode("Anime Uji", 12, "KEY");
    expect(v?.id).toBe("official1");
    expect(v?.channel).toBe("Muse Indonesia");
  });

  it("menolak video dari kanal tidak resmi", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        okJson({
          items: items([{ id: "x", title: "Anime Uji Episode 1", channel: "Random Channel" }]),
        }),
      ),
    );

    await expect(findOfficialEpisode("Anime Uji", 1, "KEY")).resolves.toBeNull();
  });

  it("mengirim permintaan ke YouTube Data API dengan key", async () => {
    const fetchMock = vi.fn(async (_url: string) => okJson({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await findOfficialEpisode("Anime Uji", 5, "RAHASIA");
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("youtube/v3/search");
    expect(url).toContain("key=RAHASIA");
    expect(url).toContain(encodeURIComponent("Anime Uji episode 5"));
    expect(url).toContain("videoEmbeddable=true");
  });

  it("memakai cache: permintaan sama tidak memanggil API dua kali", async () => {
    const fetchMock = vi.fn(async (_url: string) => okJson({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await findOfficialEpisode("Anime Uji", 7, "KEY");
    await findOfficialEpisode("Anime Uji", 7, "KEY");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("key tidak valid (403) → pesan yang bisa ditindaklanjuti", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: false,
          status: 403,
          json: async () => ({ error: { message: "quota exceeded" } }),
        }) as unknown as Response,
      ),
    );

    await expect(findOfficialEpisode("Anime Uji", 3, "KEY")).rejects.toThrow(
      /Kunci YouTube API tidak valid/,
    );
  });

  it("rate limit (429) → pesan tunggu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }) as unknown as Response),
    );

    await expect(findOfficialEpisode("Anime Uji", 3, "KEY")).rejects.toThrow(/Terlalu banyak/);
  });
});

describe("tautan cadangan & hitungan waktu", () => {
  it("youtubeSearch() membuat tautan pencarian dengan sub Indo", () => {
    expect(youtubeSearch("Anime Uji", 3)).toContain("Anime%20Uji%20episode%203%20subtitle%20indonesia");
    expect(youtubeSearch("Anime Uji")).toContain("Anime%20Uji%20subtitle%20indonesia");
  });

  it("countdown() memformat hitungan mundur", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T00:00:00Z"));
    const now = Math.floor(Date.now() / 1000);

    expect(countdown(now + 25 * 3600)).toBe("1 hr 1 j");
    expect(countdown(now + 2 * 3600)).toBe("2 j 0 m");
    expect(countdown(now + 30 * 60)).toBe("30 m");
    expect(countdown(now - 100)).toBe("0 m");

    expect(countdown(now + 25 * 3600, true)).toBe("1hr");
    expect(countdown(now + 2 * 3600, true)).toBe("2j");
    expect(countdown(now + 30 * 60, true)).toBe("30m");
  });
});
