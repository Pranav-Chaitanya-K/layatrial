import SongCard from "../components/SongCard";
import { usePlayer } from "../context/PlayerContext";
import { useUiSettings, gridMinForCardSize } from "../hooks/useUiSettings";

export default function Liked() {
  const { likedSongs } = usePlayer();
  const { songCardSize } = useUiSettings();
  const gridMin = gridMinForCardSize(songCardSize);
  const list = likedSongs || [];

  return (
    <div className="min-h-full px-6 py-8 pb-28 text-current">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-current/45">Heart stash</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Stuff you like</h1>
          <p className="text-sm text-current/55">Every tap of the heart lands right here.</p>
        </header>

        {!list.length ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.04] px-6 py-16 text-center text-sm text-current/50 shadow-inner backdrop-blur-sm transition-all duration-300">
            Hearts look lonely — find a track and show it some love.
          </div>
        ) : (
          <div
            className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,var(--min)),1fr))]"
            style={{ "--min": gridMin }}
          >
            {list.map((song) => (
              <div key={song.id || `${song.title}-${song.url || song.audioUrl}`} className="transition duration-300 ease-out hover:z-10 hover:scale-[1.02]">
                <SongCard song={song} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
