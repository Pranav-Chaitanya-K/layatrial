import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { ThemeAccentProvider } from "./context/ThemeAccentContext";
import { loadAppSettings } from "./utils/appSettings";
import Sidebar from "./components/Sidebar";
import Player from "./components/Player";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Queue from "./pages/Queue";
import Liked from "./pages/Liked";
import Settings from "./pages/Settings";

/**
 * Root shell: sidebar + themed main column + **player bar only when a track is loaded**.
 * `ThemeAccentProvider` feeds per-theme button / nav classes across the tree.
 */

const MAIN_SHELL = {
  goldBlack:
    "min-h-screen bg-neutral-950 text-amber-50 bg-[radial-gradient(ellipse_110%_55%_at_50%_-8%,rgba(245,158,11,0.22),transparent_52%)] bg-[radial-gradient(ellipse_80%_40%_at_100%_100%,rgba(180,83,9,0.12),transparent_45%)] transition-[background,color,box-shadow] duration-300 ease-out",
  purple:
    "min-h-screen bg-zinc-950 text-zinc-100 bg-[radial-gradient(ellipse_100%_50%_at_50%_-5%,rgba(139,92,246,0.24),transparent_55%)] bg-[radial-gradient(ellipse_60%_35%_at_0%_90%,rgba(88,28,135,0.15),transparent_50%)] transition-[background,color,box-shadow] duration-300 ease-out",
  whiteBlack:
    "min-h-screen bg-white text-neutral-950 bg-[linear-gradient(165deg,#ffffff_0%,#fafafa_42%,#0a0a0a_42.1%,#000000_100%)] transition-[background,color,box-shadow] duration-300 ease-out",
  neonBlue:
    "min-h-screen bg-slate-950 text-cyan-50 bg-[radial-gradient(ellipse_85%_48%_at_50%_0%,rgba(34,211,238,0.22),transparent_50%)] bg-[radial-gradient(ellipse_50%_35%_at_0%_100%,rgba(8,145,178,0.14),transparent_45%)] transition-[background,color,box-shadow] duration-300 ease-out",
  darkRed:
    "min-h-screen bg-neutral-950 text-red-50 bg-[radial-gradient(ellipse_95%_52%_at_50%_-5%,rgba(248,113,113,0.18),transparent_55%)] bg-[radial-gradient(ellipse_55%_35%_at_100%_95%,rgba(127,29,29,0.12),transparent_45%)] transition-[background,color,box-shadow] duration-300 ease-out",
  glass:
    "min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-zinc-100 bg-[radial-gradient(ellipse_70%_40%_at_30%_0%,rgba(255,255,255,0.08),transparent_55%)] backdrop-saturate-150 transition-[background,color,box-shadow] duration-300 ease-out",
};

const PLAYER_BAR = {
  goldBlack:
    "border-amber-500/15 bg-neutral-950/92 text-amber-50 shadow-[0_-12px_40px_rgba(245,158,11,0.08)] backdrop-blur-xl transition-all duration-300",
  purple:
    "border-violet-500/10 bg-zinc-950/92 text-zinc-100 shadow-[0_-12px_40px_rgba(139,92,246,0.12)] backdrop-blur-xl transition-all duration-300",
  whiteBlack:
    "border-black/20 bg-black text-zinc-50 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-300",
  neonBlue:
    "border-cyan-500/20 bg-slate-950/92 text-cyan-50 shadow-[0_-12px_40px_rgba(34,211,238,0.1)] backdrop-blur-xl transition-all duration-300",
  darkRed:
    "border-rose-900/30 bg-neutral-950/92 text-red-50 shadow-[0_-12px_40px_rgba(248,113,113,0.08)] backdrop-blur-xl transition-all duration-300",
  glass:
    "border-white/[0.1] bg-zinc-950/75 text-zinc-100 shadow-[0_-16px_48px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all duration-300",
};

function resolveTheme(id) {
  return MAIN_SHELL[id] ? id : "purple";
}

function AppShell() {
  const { currentSong } = usePlayer();
  const [theme, setTheme] = useState(() => resolveTheme(loadAppSettings().theme));

  useEffect(() => {
    const onUpdate = () => {
      setTheme(resolveTheme(loadAppSettings().theme));
    };
    window.addEventListener("utopian-settings-updated", onUpdate);
    return () => window.removeEventListener("utopian-settings-updated", onUpdate);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const mainClass = useMemo(() => MAIN_SHELL[theme] ?? MAIN_SHELL.purple, [theme]);
  const barClass = useMemo(() => PLAYER_BAR[theme] ?? PLAYER_BAR.purple, [theme]);

  const showPlayerDock = Boolean(currentSong);

  return (
    <ThemeAccentProvider theme={theme}>
      <div className="min-h-screen antialiased">
        <div className="flex">
          <Sidebar />

          <div
            data-app-theme={theme}
            className={`flex min-h-screen flex-1 flex-col pl-60 ${mainClass}`}
          >
            <main className="relative flex-1 overflow-x-hidden px-0 py-0">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/library" element={<Library />} />
                <Route path="/queue" element={<Queue />} />
                <Route path="/liked" element={<Liked />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Single `<Player>` mount: hidden footer keeps `<audio>` alive before the first track. */}
            <footer
              className={
                showPlayerDock
                  ? `sticky bottom-0 z-30 border-t px-4 py-4 ${barClass}`
                  : "pointer-events-none fixed bottom-0 left-[60px] z-0 m-0 max-h-0 w-px overflow-hidden border-0 p-0 opacity-0"
              }
              aria-label="Now playing"
              aria-hidden={!showPlayerDock}
            >
              <div
                className={
                  showPlayerDock ? "mx-auto max-w-7xl transition-opacity duration-300" : "sr-only"
                }
              >
                <Player />
              </div>
            </footer>
          </div>
        </div>
      </div>
    </ThemeAccentProvider>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </PlayerProvider>
  );
}
