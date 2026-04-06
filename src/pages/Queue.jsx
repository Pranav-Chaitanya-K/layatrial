import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useThemeAccent } from "../context/ThemeAccentContext";
import { loadPlaylists, createPlaylistRecord, addPlaylist } from "../utils/playlists";
import {
  loadSavedQueues,
  createSavedQueueRecord,
  addSavedQueue,
  removeSavedQueue,
} from "../utils/savedQueues";

/**
 * Queue — live `PlayerContext.queue` with reorder, remove, clear, save-as-playlist, and **saved queues**.
 *
 * Saved queues (localStorage key `utopian-music-saved-queues`):
 * - Named snapshots separate from Library playlists (`../utils/savedQueues.js`).
 * - **Create** stores an optional empty list or you add the current queue afterward.
 * - **Add current queue** clones the live queue into a new saved record (prompts for name).
 * - **Load** replaces the player queue via `setQueueAndPlay` and starts at 0.
 * - **Delete** removes one saved record.
 *
 * Reordering uses HTML5 drag-and-drop; indices flow through `reorderQueue(from, to)` in the provider.
 */

function formatTime(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function pickTitle(s) {
  return s?.title || s?.name || "Untitled";
}

function pickArtist(s) {
  return s?.artist || s?.primaryArtists || "—";
}

function pickDuration(s) {
  const d = Number(s?.duration);
  return Number.isFinite(d) && d > 0 ? formatTime(d) : "—";
}

function pickThumb(s) {
  return s?.image || "";
}

export default function Queue() {
  const accent = useThemeAccent();
  const {
    queue,
    currentIndex,
    currentSong,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    setQueueAndPlay,
  } = usePlayer();

  const [dragIndex, setDragIndex] = useState(null);
  const [savedList, setSavedList] = useState(() => loadSavedQueues());
  const [newQueueName, setNewQueueName] = useState("");

  const refreshSaved = useCallback(() => setSavedList(loadSavedQueues()), []);

  /** Keep list in sync if another part of the app mutates storage (rare). */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "utopian-music-saved-queues") refreshSaved();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshSaved]);

  const savedTotalTracks = useMemo(
    () => savedList.reduce((acc, q) => acc + (Array.isArray(q.songs) ? q.songs.length : 0), 0),
    [savedList]
  );

  const onDragStart = useCallback((e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e, dropIndex) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("text/plain");
      const from = Number.parseInt(raw, 10);
      if (Number.isNaN(from)) return;
      reorderQueue(from, dropIndex);
      setDragIndex(null);
    },
    [reorderQueue]
  );

  const onDragEnd = useCallback(() => setDragIndex(null), []);

  const handleSavePlaylist = () => {
    if (!queue.length) {
      window.alert("Nothing to save — the queue is empty.");
      return;
    }
    const name = window.prompt("Playlist name", "Queue");
    if (name === null) return;
    const existing = loadPlaylists();
    const record = createPlaylistRecord(name, [...queue]);
    addPlaylist(existing, record);
    window.alert(`Saved “${record.name}” to your library.`);
  };

  const playRow = (index) => {
    setQueueAndPlay([...queue], index);
  };

  /** Persist a brand-new named saved queue (starts empty — user can load tracks into live queue and re-save). */
  const handleCreateSavedQueue = () => {
    const name = (newQueueName || "").trim() || "My queue";
    const record = createSavedQueueRecord(name, []);
    const next = addSavedQueue(savedList, record);
    setSavedList(next);
    setNewQueueName("");
  };

  /** Snapshot the live queue into saved queues (new row). */
  const handleAddCurrentToSaved = () => {
    if (!queue.length) {
      window.alert("Queue is empty — add songs first.");
      return;
    }
    const defaultName = `Queue · ${new Date().toLocaleString()}`;
    const name = window.prompt("Name for this saved queue", defaultName);
    if (name === null) return;
    const record = createSavedQueueRecord(name, [...queue]);
    const next = addSavedQueue(savedList, record);
    setSavedList(next);
  };

  const handleLoadSaved = (sq) => {
    const songs = Array.isArray(sq.songs) ? sq.songs : [];
    if (!songs.length) {
      window.alert("This saved queue is empty. Play songs, then use “Add current queue” to fill it.");
      return;
    }
    setQueueAndPlay([...songs], 0);
  };

  const handleDeleteSaved = (id) => {
    if (!window.confirm("Delete this saved queue?")) return;
    const next = removeSavedQueue(savedList, id);
    setSavedList(next);
  };

  return (
    <div className="min-h-full px-6 py-8 pb-32 text-current">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-current/45">Up next</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">The line-up</h1>
          <p className="text-sm text-current/55">Drag, nudge, snapshot — you’re conducting.</p>
        </header>

        {/* Saved queues — local snapshots */}
        <section
          className="glass-panel space-y-4 p-5 transition-all duration-300"
          aria-labelledby="saved-queues-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="saved-queues-heading" className="text-sm font-semibold text-current">
                Stashed queues
              </h2>
              <p className="text-xs text-current/50">
                {savedList.length} presets · {savedTotalTracks} tracks remembered
              </p>
            </div>
            <button
              type="button"
              title="Save live line-up as a preset"
              onClick={handleAddCurrentToSaved}
              disabled={!queue.length}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 ${accent.btnOutline}`}
            >
              Memorize this queue
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={newQueueName}
              onChange={(e) => setNewQueueName(e.target.value)}
              placeholder="Name this moment"
              title="Preset name"
              className={`min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-white/[0.06] px-4 py-2.5 text-sm text-current placeholder:text-current/40 shadow-inner backdrop-blur-md transition duration-200 ${accent.focusRing} focus:outline-none focus:ring-2`}
            />
            <button
              type="button"
              title="Create empty preset slot"
              onClick={handleCreateSavedQueue}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md transition-all duration-200 hover:scale-[1.02] ${accent.btn}`}
            >
              New preset
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-current/50">
            Capture the live mix anytime — name it like a mixtape.
          </p>

          {!savedList.length ? (
            <p className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.03] px-4 py-8 text-center text-sm text-current/50">
              No presets yet — start a vibe above.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 utopian-scrollbar" role="list">
              {savedList.map((sq) => (
                <li
                  key={sq.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 transition-all duration-200 hover:border-white/[0.15] hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-current">{sq.name}</p>
                    <p className="text-xs text-current/50">
                      {(sq.songs && sq.songs.length) || 0} song{(sq.songs?.length === 1) ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    title="Load preset into player"
                    onClick={() => handleLoadSaved(sq)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:scale-[1.02] ${accent.btn}`}
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    title="Delete preset"
                    onClick={() => handleDeleteSaved(sq.id)}
                    className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs font-medium text-current/50 transition hover:border-rose-500/40 hover:text-rose-400"
                  >
                    Drop
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            title="Send line-up to Library"
            onClick={handleSavePlaylist}
            disabled={!queue.length}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 ${accent.btn}`}
          >
            Send to Library
          </button>
          <button
            type="button"
            title="Clear everything waiting"
            onClick={() => {
              if (!queue.length) return;
              if (window.confirm("Clear the entire queue?")) clearQueue();
            }}
            disabled={!queue.length}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 ${accent.btnMuted} border`}
          >
            Clear all
          </button>
        </div>

        <div
          className={[
            "overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/50 shadow-2xl shadow-black/40",
            "backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-inset ring-white/[0.04]",
          ].join(" ")}
        >
          {!queue.length ? (
            <div className="px-6 py-16 text-center text-sm text-current/50">
              Nothing queued — go hunt a track.
            </div>
          ) : (
            <ul
              className="max-h-[min(70vh,560px)] divide-y divide-white/[0.05] overflow-y-auto overscroll-contain transition-[max-height] duration-300 utopian-scrollbar"
              role="list"
            >
              {queue.map((song, index) => {
                const active = index === currentIndex;
                return (
                  <li
                    key={`${song.id || song.url || song.audioUrl}-${index}`}
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, index)}
                    className={[
                      "group flex items-center gap-3 px-3 py-2.5 transition-all duration-200",
                      active ? `bg-white/[0.08] ring-2 ${accent.cardRing}` : "hover:bg-white/[0.04]",
                      dragIndex === index ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      aria-label="Drag to reorder"
                      draggable
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragEnd={onDragEnd}
                      className="cursor-grab touch-none rounded-md p-2 text-zinc-500 transition duration-200 hover:scale-105 hover:bg-white/[0.06] hover:text-zinc-300 active:cursor-grabbing"
                    >
                      <span className="text-sm leading-none text-zinc-500" aria-hidden>
                        ☰
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => playRow(index)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity duration-200"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-black/25 ring-1 ring-white/10 transition duration-200 group-hover:ring-current/25">
                        {pickThumb(song) ? (
                          <img src={pickThumb(song)} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">♪</div>
                        )}
                        {active && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-[10px] font-bold uppercase tracking-wider text-white">
                            Now
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${active ? "text-current" : "text-current/90"}`}>
                          {pickTitle(song)}
                        </p>
                        <p className="truncate text-xs text-current/50">{pickArtist(song)}</p>
                      </div>
                      <span className="shrink-0 tabular-nums text-xs text-current/45">{pickDuration(song)}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromQueue(index)}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 opacity-0 transition duration-200 hover:bg-rose-500/15 hover:text-rose-300 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {currentSong && (
          <p className="text-center text-xs text-current/45">
            Track {currentIndex + 1} of {queue.length || "—"}
          </p>
        )}
      </div>
    </div>
  );
}
