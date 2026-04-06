import { useCallback, useEffect, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useThemeAccent } from "../context/ThemeAccentContext";
import {
  STORAGE_KEY,
  loadPlaylists,
  createPlaylistRecord,
  addPlaylist,
  removePlaylist,
  markPlaylistPlayed,
} from "../utils/playlists";

/**
 * Library — persisted playlists / saved queues in `localStorage`.
 *
 * Storage:
 * - `loadPlaylists()` reads the JSON array written by `savePlaylists` in `../utils/playlists.js`.
 * - Keys and schema are centralized there so Queue.jsx and Library stay compatible.
 * - We listen for the `storage` event so another tab’s changes can refresh this list (same origin).
 *
 * Player:
 * - “Play playlist” calls `setQueueAndPlay(songs, 0)` to replace the live queue and start playback,
 *   then `markPlaylistPlayed` updates `lastPlayed` on that record.
 *
 * Layout:
 * - Responsive card grid; each card shows name, counts, and last played timestamp.
 */

function formatRelative(iso) {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Library() {
  const accent = useThemeAccent();
  const { setQueueAndPlay } = usePlayer();
  const [playlists, setPlaylists] = useState(() => loadPlaylists());

  const refresh = useCallback(() => {
    setPlaylists(loadPlaylists());
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const handleCreate = () => {
    const name = window.prompt("Playlist name", "My playlist");
    if (name === null) return;
    const record = createPlaylistRecord(name, []);
    setPlaylists((prev) => addPlaylist(prev, record));
  };

  const handlePlay = (pl) => {
    if (!pl.songs?.length) {
      window.alert("This playlist is empty.");
      return;
    }
    setQueueAndPlay(pl.songs, 0);
    setPlaylists((prev) => markPlaylistPlayed(prev, pl.id));
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Remove this playlist from your library?")) return;
    setPlaylists((prev) => removePlaylist(prev, id));
  };

  return (
    <div className="min-h-full px-6 py-8 pb-28 text-current">
      <div className="mx-auto max-w-6xl space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-current/45">Your crates</p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Library</h1>
            <p className="mt-1 text-sm text-current/55">Mixtapes and moods you’ve saved — tap one and press play.</p>
          </div>
          <button
            type="button"
            title="Start a blank playlist"
            onClick={handleCreate}
            className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02] ${accent.btn} ${accent.focusRing} focus:outline-none focus-visible:ring-2`}
          >
            New playlist
          </button>
        </div>

        {!playlists.length ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.04] px-6 py-16 text-center text-sm text-current/50 shadow-inner backdrop-blur-sm transition duration-300">
            Nothing saved yet — heart tracks or build a queue worth keeping.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((pl) => (
              <li key={pl.id}>
                <div
                  className={[
                    "group flex h-full flex-col rounded-2xl border border-white/[0.1] bg-white/[0.05] p-5 shadow-lg backdrop-blur-xl transition-all duration-300",
                    "ring-1 ring-inset ring-white/[0.04] hover:-translate-y-1 hover:scale-[1.01] hover:border-white/[0.18] hover:shadow-xl",
                  ].join(" ")}
                >
                  <h2 className="line-clamp-2 text-base font-semibold text-current">{pl.name}</h2>
                  <p className="mt-2 text-xs text-current/55">
                    {(pl.songs && pl.songs.length) || 0} song{(pl.songs?.length === 1) ? "" : "s"}
                  </p>
                  <p className="mt-1 text-xs text-current/45">Last spin · {formatRelative(pl.lastPlayed)}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      title="Play this playlist now"
                      onClick={() => handlePlay(pl)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition hover:scale-[1.02] ${accent.btn}`}
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      title="Remove playlist"
                      onClick={(e) => handleDelete(pl.id, e)}
                      className="rounded-lg border border-white/[0.1] px-3 py-2 text-xs font-medium text-current/50 transition hover:border-rose-500/40 hover:text-rose-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
