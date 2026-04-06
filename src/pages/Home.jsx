import { useCallback, useEffect, useMemo, useState } from "react";
import { getTrendingSongs, searchSongs } from "../services/api";
import SongCard from "../components/SongCard";
import SearchPreviewTray from "../components/SearchPreviewTray";
import { usePlayer } from "../context/PlayerContext";
import { useThemeAccent } from "../context/ThemeAccentContext";
import { useUiSettings, gridMinForCardSize } from "../hooks/useUiSettings";
import { loadAppSettings, APP_SETTINGS_KEY } from "../utils/appSettings";

/**
 * Home — hero greeting, “Collection” cards, live search + preview tray, grids sized by Settings.
 */

const SEARCH_DEBOUNCE_MS = 380;
const TRENDING_TARGET = 96;
const SEARCH_LIMIT = 45;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Made for you: a **short** recent tail + likes — not the entire history. */
function mergeMadeForYou(recent, liked) {
  const recentSlice = (recent || []).slice(0, 10);
  const seen = new Set();
  const out = [];
  for (const s of [...liked || [], ...recentSlice]) {
    if (!s || typeof s !== "object") continue;
    const id = String(s.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(s);
    if (out.length >= 28) break;
  }
  return out;
}

function SmartCard({ title, description, count, active, onSelect, accent, blob }) {
  return (
    <button
      type="button"
      title={`Open ${title}`}
      onClick={onSelect}
      className={[
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
        "border-white/[0.08] bg-white/[0.05] shadow-lg backdrop-blur-md",
        "hover:-translate-y-1 hover:scale-[1.01] hover:border-white/[0.15] hover:shadow-xl",
        active ? `ring-2 ${accent.cardRing} bg-white/[0.08] shadow-lg` : "hover:bg-white/[0.07]",
      ].join(" ")}
    >
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-45 blur-3xl transition duration-500 group-hover:opacity-65 ${blob}`}
        aria-hidden
      />
      <h3 className="relative text-sm font-semibold tracking-tight text-current">{title}</h3>
      <p className="relative mt-1 line-clamp-2 text-xs leading-relaxed text-current/55">{description}</p>
      <p className="relative mt-4 text-[11px] font-medium uppercase tracking-wider text-current/40">
        {count === 0 ? "Empty for now" : `${count} tracks`}
      </p>
      <span className="relative mt-3 inline-flex items-center text-xs font-semibold text-current/70 opacity-0 transition duration-300 group-hover:opacity-100">
        Jump in →
      </span>
    </button>
  );
}

export default function Home() {
  const accent = useThemeAccent();
  const { songCardSize } = useUiSettings();
  const gridMin = gridMinForCardSize(songCardSize);

  const { likedSongs, recentSongs, setQueueAndPlay } = usePlayer();

  const [langPrefs, setLangPrefs] = useState(() => loadAppSettings().languagePreferences || ["en"]);

  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [activeSection, setActiveSection] = useState("trending");

  const madeForYou = useMemo(
    () => mergeMadeForYou(recentSongs || [], likedSongs || []),
    [recentSongs, likedSongs]
  );

  const langKey = useMemo(() => (langPrefs || []).join(","), [langPrefs]);

  useEffect(() => {
    const syncLang = () => setLangPrefs(loadAppSettings().languagePreferences || ["en"]);
    window.addEventListener("utopian-settings-updated", syncLang);
    const onStorage = (e) => {
      if (e.key === APP_SETTINGS_KEY) syncLang();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("utopian-settings-updated", syncLang);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTrendingLoading(true);
      setTrendingError(null);
      const { songs, error } = await getTrendingSongs({
        languagePreferences: langPrefs,
        targetCount: TRENDING_TARGET,
      });
      if (cancelled) return;
      setTrending(songs || []);
      setTrendingError(error);
      setTrendingLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [langKey]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setSearchLoading(true);
    const t = window.setTimeout(async () => {
      const { songs, error } = await searchSongs(q, { limit: SEARCH_LIMIT });
      setSearchResults(songs || []);
      setSearchError(error);
      setSearchLoading(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [searchQuery]);

  const gridSongs = useMemo(() => {
    if (hasSearched && searchQuery.trim()) return searchResults;
    if (activeSection === "trending") return trending;
    if (activeSection === "madeForYou") return madeForYou;
    if (activeSection === "recent") return recentSongs || [];
    return trending;
  }, [hasSearched, searchQuery, searchResults, activeSection, trending, madeForYou, recentSongs]);

  const gridTitle = useMemo(() => {
    if (hasSearched && searchQuery.trim()) return `“${searchQuery.trim()}”`;
    if (activeSection === "trending") return "India’s pulse";
    if (activeSection === "madeForYou") return "Your blend";
    if (activeSection === "recent") return "What you’ve been up to";
    return "Listen";
  }, [hasSearched, searchQuery, activeSection]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
  }, []);

  const playFromTray = useCallback(
    (track) => {
      if (!track) return;
      setQueueAndPlay([track], 0);
    },
    [setQueueAndPlay]
  );

  const onSearchSubmit = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <div className="min-h-full px-6 py-8 pb-28 text-current">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-current md:text-3xl">{greeting()}</h1>
            <p className="mt-1 text-sm text-current/55">Fresh soundtracks, big names, and your taste — in one scroll.</p>
          </div>

          <form onSubmit={onSearchSubmit} className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative flex-1">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What do you want to hear?"
                autoComplete="off"
                title="Search as you type — results below"
                className={`w-full rounded-xl border border-white/[0.1] bg-white/[0.06] py-3 pl-11 pr-4 text-sm text-current placeholder:text-current/40 shadow-inner backdrop-blur-md transition-all duration-200 ${accent.focusRing} focus:border-current/30 focus:outline-none focus:ring-2`}
              />
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-current/40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <SearchPreviewTray
                query={searchQuery}
                songs={searchResults}
                loading={searchLoading}
                onPlaySong={playFromTray}
                accent={accent}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                title="Run search"
                className={`rounded-xl px-5 py-3 text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02] ${accent.btn} ${accent.focusRing} focus:outline-none focus-visible:ring-2`}
              >
                Go
              </button>
              {hasSearched && (
                <button
                  type="button"
                  title="Clear search"
                  onClick={clearSearch}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${accent.btnMuted} border`}
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </header>

        <section aria-label="Collections">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-current/45">Collections</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <SmartCard
              title="Hot right now"
              description="Blockbusters, playback royalty, and brand-new OST drops."
              count={trending.length}
              active={!hasSearched && activeSection === "trending"}
              onSelect={() => {
                clearSearch();
                setActiveSection("trending");
              }}
              accent={accent}
              blob={accent.heroBlob}
            />
            <SmartCard
              title="Your blend"
              description="Likes first, then a handful of fresh replays — never your whole diary."
              count={madeForYou.length}
              active={!hasSearched && activeSection === "madeForYou"}
              onSelect={() => {
                clearSearch();
                setActiveSection("madeForYou");
              }}
              accent={accent}
              blob="bg-fuchsia-600/35"
            />
            <SmartCard
              title="What you’ve been up to"
              description="The last things you had on repeat."
              count={(recentSongs || []).length}
              active={!hasSearched && activeSection === "recent"}
              onSelect={() => {
                clearSearch();
                setActiveSection("recent");
              }}
              accent={accent}
              blob="bg-emerald-500/30"
            />
          </div>
        </section>

        <section aria-label="Song grid" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold text-current">{gridTitle}</h2>
            {(trendingLoading || searchLoading) && (
              <span className={`text-xs animate-pulse ${accent.pulse}`}>Curating…</span>
            )}
          </div>

          {(trendingError && activeSection === "trending" && !hasSearched) || (searchError && hasSearched) ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
              {searchError || trendingError}
            </p>
          ) : null}

          {!gridSongs.length && !trendingLoading && !searchLoading ? (
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.04] px-6 py-16 text-center text-sm text-current/50 backdrop-blur-sm">
              {activeSection === "madeForYou" && !madeForYou.length
                ? "Heart a few tracks — we’ll spin a mix."
                : activeSection === "recent" && !(recentSongs || []).length
                  ? "Play something loud. Your trail shows up here."
                  : hasSearched && searchQuery.trim()
                    ? "No luck — try another hook."
                    : "Nothing here yet."}
            </div>
          ) : (
            <div
              className="grid gap-6 transition-opacity duration-300 [grid-template-columns:repeat(auto-fill,minmax(min(100%,var(--min)),1fr))]"
              style={{ "--min": gridMin }}
            >
              {gridSongs.map((song) => (
                <div
                  key={song.id || song.url || song.audioUrl}
                  className="transition duration-300 ease-out hover:z-10 hover:scale-[1.02]"
                  style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.12))" }}
                >
                  <SongCard song={song} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
