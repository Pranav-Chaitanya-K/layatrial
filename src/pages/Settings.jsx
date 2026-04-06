import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadAppSettings,
  mergeAppSettings,
  LANGUAGE_OPTIONS,
  APP_SETTINGS_KEY,
} from "../utils/appSettings";
import { useThemeAccent } from "../context/ThemeAccentContext";
import { usePlayer } from "../context/PlayerContext";

/**
 * Settings — theme, discovery languages, layout, privacy, player defaults.
 * Copy stays product-forward (no storage jargon).
 */

const THEMES = [
  {
    id: "goldBlack",
    label: "Gold + Black",
    hint: "Warm lights, midnight canvas",
    previewClass:
      "bg-neutral-950 bg-[radial-gradient(ellipse_100%_80%_at_50%_0%,rgba(245,158,11,0.35),transparent_60%)]",
    accent: "from-amber-400 to-amber-600",
  },
  {
    id: "purple",
    label: "Purple",
    hint: "Studio violet — classic mine",
    previewClass: "bg-zinc-950 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.35),transparent_55%)]",
    accent: "from-violet-400 to-fuchsia-500",
  },
  {
    id: "whiteBlack",
    label: "White + Black",
    hint: "Paper bright, ink deep",
    previewClass: "bg-gradient-to-b from-white to-neutral-200",
    accent: "from-neutral-800 to-black",
  },
  {
    id: "neonBlue",
    label: "Neon Blue",
    hint: "Late-night cyan pulse",
    previewClass: "bg-slate-950 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(34,211,238,0.3),transparent_55%)]",
    accent: "from-cyan-400 to-blue-500",
  },
  {
    id: "darkRed",
    label: "Dark Red",
    hint: "Velvet crimson glow",
    previewClass: "bg-neutral-950 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(248,113,113,0.28),transparent_55%)]",
    accent: "from-rose-400 to-red-600",
  },
  {
    id: "glass",
    label: "Glass",
    hint: "Frosted layers, city lights",
    previewClass:
      "bg-gradient-to-b from-zinc-800/90 via-zinc-900 to-black backdrop-blur-md",
    accent: "from-white/40 to-white/10",
  },
];

function Toggle({ checked, onChange, label, accent }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={label}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition-all duration-200",
        checked ? accent.toggleOn : accent.toggleOff,
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-6 w-6 translate-y-px rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function readAllSettings() {
  const s = loadAppSettings();
  return {
    theme: s.theme,
    languagePreferences: s.languagePreferences || ["en"],
    spatialAudio: Boolean(s.spatialAudio),
    defaultVolume: typeof s.defaultVolume === "number" ? s.defaultVolume : 1,
    defaultShuffle: Boolean(s.defaultShuffle),
    defaultRepeat: ["off", "all", "one"].includes(s.defaultRepeat) ? s.defaultRepeat : "off",
    songCardSize: ["comfortable", "cozy", "compact"].includes(s.songCardSize) ? s.songCardSize : "comfortable",
    showSongCardImages: s.showSongCardImages !== false,
  };
}

export default function Settings() {
  const accent = useThemeAccent();
  const { clearRecentHistory, recentSongs } = usePlayer();

  const initial = useMemo(() => readAllSettings(), []);
  const [theme, setTheme] = useState(initial.theme);
  const [languagePreferences, setLanguagePreferences] = useState(initial.languagePreferences);
  const [spatialAudio, setSpatialAudio] = useState(initial.spatialAudio);
  const [defaultVolume, setDefaultVolume] = useState(initial.defaultVolume);
  const [defaultShuffle, setDefaultShuffle] = useState(initial.defaultShuffle);
  const [defaultRepeat, setDefaultRepeat] = useState(initial.defaultRepeat);
  const [songCardSize, setSongCardSize] = useState(initial.songCardSize);
  const [showSongCardImages, setShowSongCardImages] = useState(initial.showSongCardImages);

  const hydrate = useCallback(() => {
    const s = readAllSettings();
    setTheme(s.theme);
    setLanguagePreferences(s.languagePreferences);
    setSpatialAudio(s.spatialAudio);
    setDefaultVolume(s.defaultVolume);
    setDefaultShuffle(s.defaultShuffle);
    setDefaultRepeat(s.defaultRepeat);
    setSongCardSize(s.songCardSize);
    setShowSongCardImages(s.showSongCardImages);
  }, []);

  useEffect(() => {
    const onUpdated = () => hydrate();
    const onStorage = (e) => {
      if (e.key === APP_SETTINGS_KEY) hydrate();
    };
    window.addEventListener("utopian-settings-updated", onUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("utopian-settings-updated", onUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrate]);

  const persist = (partial) => mergeAppSettings(partial);

  const toggleLang = (id) => {
    const has = languagePreferences.includes(id);
    let next = has ? languagePreferences.filter((x) => x !== id) : [...languagePreferences, id];
    if (!next.length) next = ["en"];
    setLanguagePreferences(next);
    persist({ languagePreferences: next });
  };

  const langSummary =
    languagePreferences.length > 2
      ? `${languagePreferences.length} regions in the mix`
      : LANGUAGE_OPTIONS.filter((l) => languagePreferences.includes(l.id))
          .map((l) => l.label.split("—")[0].trim())
          .join(" · ");

  return (
    <div className="min-h-full px-6 py-8 pb-28 text-current">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="utopian-fade-in space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-current/45">Your space</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Tune mine to you</h1>
          <p className="text-sm text-current/55">
            Themes, layout, and discovery — flip something and it’s yours instantly.
          </p>
        </header>

        <section
          className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-glass backdrop-blur-xl transition-all duration-300 dark:border-white/[0.08]"
          aria-labelledby="theme-heading"
        >
          <h2 id="theme-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-current/45">
            Look &amp; feel
          </h2>
          <p className="mt-2 text-sm text-current/55">Pick a mood — buttons and highlights follow along.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {THEMES.map((t) => {
              const selected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  title={`Use ${t.label} theme`}
                  onClick={() => {
                    setTheme(t.id);
                    persist({ theme: t.id });
                  }}
                  className={[
                    "group relative overflow-hidden rounded-2xl border text-left transition-all duration-300",
                    accent.focusRing,
                    "focus:outline-none focus-visible:ring-2",
                    selected
                      ? `scale-[1.01] shadow-lg ${accent.cardRing} ring-2 bg-white/[0.06]`
                      : "border-white/[0.08] bg-white/[0.03] hover:scale-[1.005] hover:border-white/[0.14] hover:shadow-md",
                  ].join(" ")}
                >
                  <div className={`relative h-20 w-full ${t.previewClass}`}>
                    <div
                      className={`absolute inset-x-4 bottom-3 h-1 rounded-full bg-gradient-to-r ${t.accent} shadow-md`}
                      aria-hidden
                    />
                  </div>
                  <div className="space-y-0.5 px-4 py-3">
                    <p className="text-sm font-medium text-current">{t.label}</p>
                    <p className="text-xs text-current/50">{t.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-glass backdrop-blur-xl"
          aria-labelledby="layout-heading"
        >
          <h2 id="layout-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-current/45">
            Song cards
          </h2>
          <p className="mt-2 text-sm text-current/55">Dial grid density and artwork to match your vibe.</p>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-current">Tile size</p>
              <p className="text-xs text-current/50 mb-2">Comfortable · cozy · compact</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "comfortable", label: "Comfortable" },
                  { id: "cozy", label: "Cozy" },
                  { id: "compact", label: "Compact" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    title={`${opt.label} tiles`}
                    onClick={() => {
                      setSongCardSize(opt.id);
                      persist({ songCardSize: opt.id });
                    }}
                    className={[
                      "rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
                      songCardSize === opt.id
                        ? `${accent.btn} scale-105 shadow-md`
                        : `${accent.btnMuted} border`,
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-current">Show cover art</p>
                <p className="text-xs text-current/50">Turn off for a minimal, lyrics-poster look</p>
              </div>
              <Toggle
                checked={showSongCardImages}
                accent={accent}
                onChange={(v) => {
                  setShowSongCardImages(v);
                  persist({ showSongCardImages: v });
                }}
                label="Toggle cover art on song cards"
              />
            </div>
          </div>
        </section>

        <section
          className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-glass backdrop-blur-xl"
          aria-labelledby="lang-heading"
        >
          <h2 id="lang-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-current/45">
            Discovery mix
          </h2>
          <p className="mt-2 text-sm text-current/55">
            Stack regions you love — we blend them into recommendations, then widen the net so you still discover
            surprises.
          </p>
          <p className="mt-2 text-xs font-medium text-current/60">Active lean: {langSummary}</p>

          <div
            className="mt-4 flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1 utopian-scrollbar rounded-xl border border-white/[0.06] bg-black/[0.08] p-3 dark:bg-white/[0.04]"
            role="group"
            aria-label="Choose languages for discovery"
          >
            {LANGUAGE_OPTIONS.map((opt) => {
              const on = languagePreferences.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={on ? `Remove ${opt.label} from mix` : `Add ${opt.label} to mix`}
                  onClick={() => toggleLang(opt.id)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    on
                      ? `${accent.btn} border-transparent`
                      : "border-white/15 bg-white/[0.06] text-current/70 hover:border-current/25 hover:bg-white/[0.1]",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-glass backdrop-blur-xl"
          aria-labelledby="privacy-heading"
        >
          <h2 id="privacy-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-current/45">
            Privacy
          </h2>
          <p className="mt-2 text-sm text-current/55">Your listening trail stays on this device until you clear it.</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-current/70">
              {(recentSongs || []).length} songs in “What you’ve been up to”
            </p>
            <button
              type="button"
              title="Erase recent listening from this device"
              onClick={() => {
                if (!(recentSongs || []).length) return;
                if (!window.confirm("Clear your listening history on this device?")) return;
                clearRecentHistory();
              }}
              disabled={!(recentSongs || []).length}
              className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all duration-200 disabled:opacity-40 ${accent.btnOutline} disabled:cursor-not-allowed`}
            >
              Clear history
            </button>
          </div>
        </section>

        <section
          className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-glass backdrop-blur-xl"
          aria-labelledby="spatial-heading"
        >
          <h2 id="spatial-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-current/45">
            Spatial
          </h2>
          <p className="mt-2 text-sm text-current/55">Widen the stereo field when you’re on headphones.</p>
          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-current">Wide stage</p>
            <Toggle
              checked={spatialAudio}
              accent={accent}
              onChange={(v) => {
                setSpatialAudio(v);
                persist({ spatialAudio: v });
              }}
              label="Spatial widening"
            />
          </div>
        </section>

        <section
          className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-glass backdrop-blur-xl"
          aria-labelledby="player-heading"
        >
          <h2 id="player-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-current/45">
            Playback habits
          </h2>
          <p className="mt-2 text-sm text-current/55">Defaults kick in whenever you open mine fresh.</p>

          <div className="mt-6 space-y-6">
            <div>
              <label className="flex items-center justify-between gap-4 text-sm text-current/80">
                Starting volume
                <span className="tabular-nums text-current/50">{Math.round(defaultVolume * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                title="Default volume when app opens"
                value={defaultVolume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setDefaultVolume(v);
                  persist({ defaultVolume: v });
                }}
                className="utopian-range mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08]"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-current">Shuffle on by default</p>
                <p className="text-xs text-current/50">Queues arrive scrambled</p>
              </div>
              <Toggle
                checked={defaultShuffle}
                accent={accent}
                onChange={(v) => {
                  setDefaultShuffle(v);
                  persist({ defaultShuffle: v });
                }}
                label="Default shuffle"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-current">Repeat</p>
              <p className="mb-2 text-xs text-current/50">How the queue loops</p>
              <div className="flex flex-wrap gap-2">
                {["off", "all", "one"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    title={mode === "off" ? "No repeat" : mode === "all" ? "Repeat entire queue" : "Repeat this track"}
                    onClick={() => {
                      setDefaultRepeat(mode);
                      persist({ defaultRepeat: mode });
                    }}
                    className={[
                      "rounded-lg px-3 py-2 text-xs font-semibold capitalize transition-all duration-200",
                      defaultRepeat === mode
                        ? `${accent.btn} scale-105 shadow-md`
                        : `${accent.btnMuted} border border-white/[0.08]`,
                    ].join(" ")}
                  >
                    {mode === "off" ? "Off" : mode === "all" ? "Queue" : "One"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
