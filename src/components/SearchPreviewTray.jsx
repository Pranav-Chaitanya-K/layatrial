/**
 * Compact live results dock under a search field — tap a row to jump straight into playback.
 */

function toPlayable(song) {
  if (!song || typeof song !== "object") return null;
  const url =
    song.url ||
    song.audioUrl ||
    song.media_url ||
    (Array.isArray(song.downloadUrl) && song.downloadUrl[0]?.url) ||
    "";
  return { ...song, url };
}

export default function SearchPreviewTray({ query, songs, loading, onPlaySong, accent }) {
  const q = (query || "").trim();
  if (!q) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-white/[0.1] bg-black/80 shadow-2xl backdrop-blur-xl dark:bg-zinc-950/95"
      role="listbox"
      aria-label="Live search matches"
    >
      <div className="border-b border-white/[0.06] px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-current/50">
        {loading ? "Catching matches…" : `${songs.length} tracks`}
      </div>
      <ul className="max-h-52 overflow-y-auto utopian-scrollbar py-1">
        {!loading && !songs.length ? (
          <li className="px-4 py-6 text-center text-sm text-current/45">Nothing yet — keep typing.</li>
        ) : (
          songs.slice(0, 12).map((song) => {
            const playable = toPlayable(song);
            const can = Boolean(playable?.url);
            const title = song.title || song.name || "Untitled";
            const artist = song.artist || song.primaryArtists || "—";
            return (
              <li key={song.id || title + artist}>
                <button
                  type="button"
                  disabled={!can}
                  title={can ? `Play “${title}”` : "No stream for this result"}
                  onClick={() => can && onPlaySong(playable)}
                  className={[
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-all duration-200",
                    can
                      ? "hover:bg-white/[0.08] focus:bg-white/[0.08]"
                      : "cursor-not-allowed opacity-45",
                  ].join(" ")}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${accent.chip}`}
                  >
                    ♪
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-current">{title}</span>
                    <span className="block truncate text-xs text-current/50">{artist}</span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
