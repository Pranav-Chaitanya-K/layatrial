import { usePlayer } from "../context/PlayerContext";
import { useThemeAccent } from "../context/ThemeAccentContext";
import { useUiSettings } from "../hooks/useUiSettings";

/**
 * Track tile — respects Settings for **density** and **cover art** visibility.
 */

function toPlayerSong(song) {
  if (!song || typeof song !== "object") return null;
  const url =
    song.url ||
    song.audioUrl ||
    song.media_url ||
    (Array.isArray(song.downloadUrl) && song.downloadUrl[0]?.url) ||
    "";
  return { ...song, url };
}

function formatDuration(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function isSameTrack(a, b) {
  if (!a || !b) return false;
  const idA = String(a.id ?? "").trim();
  const idB = String(b.id ?? "").trim();
  if (idA && idB && idA === idB) return true;
  const uA = a.url || a.audioUrl || "";
  const uB = b.url || b.audioUrl || "";
  return uA && uB && uA === uB;
}

function IconPlay({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}

function IconPause({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z" />
    </svg>
  );
}

function IconHeart({ className, filled }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
      />
    </svg>
  );
}

function IconQueueAdd({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export default function SongCard({ song, className = "" }) {
  const accent = useThemeAccent();
  const { songCardSize, showSongCardImages } = useUiSettings();

  const {
    currentSong,
    isPlaying,
    togglePlayPause,
    setQueueAndPlay,
    addToQueue,
    toggleLike,
    isLiked,
  } = usePlayer();

  if (!song) return null;

  const track = toPlayerSong(song);
  const title = song.title || song.name || "Untitled";
  const artist = song.artist || song.primaryArtists || "Unknown artist";
  const image = song.image || "";
  const duration = song.duration;

  const active = isSameTrack(currentSong, song);
  const liked = isLiked(song);

  const pad = songCardSize === "compact" ? "p-3 gap-2" : songCardSize === "cozy" ? "p-3.5 gap-2.5" : "p-4 gap-3";
  const artAspect = songCardSize === "compact" ? "aspect-[4/3]" : "aspect-square";
  const titleCls = songCardSize === "compact" ? "text-xs" : "text-sm";

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (!track?.url) return;
    if (active) {
      togglePlayPause();
      return;
    }
    setQueueAndPlay([track], 0);
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    toggleLike(toPlayerSong(song) || song);
  };

  const handleQueueClick = (e) => {
    e.stopPropagation();
    const t = toPlayerSong(song);
    if (t?.url) addToQueue(t);
  };

  const playable = Boolean(track?.url);

  return (
    <article
      className={[
        "group relative flex w-full min-w-0 max-w-md flex-col overflow-hidden rounded-2xl",
        "border border-white/[0.08] bg-white/[0.06] shadow-lg backdrop-blur-md",
        "ring-1 ring-inset ring-white/[0.05]",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out",
        "hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl",
        active ? `ring-2 ${accent.cardRing}` : `hover:border-current/20`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showSongCardImages ? (
        <div className={`relative w-full overflow-hidden bg-black/20 ${artAspect}`}>
          {image ? (
            <img
              src={image}
              alt=""
              className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${accent.gradient} text-3xl font-light text-white/80 opacity-90`}
              aria-hidden
            >
              ♪
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent opacity-80" />

          <div
            className={[
              "absolute inset-0 flex items-center justify-center gap-2",
              "bg-black/0 transition-colors duration-300 group-hover:bg-black/40",
              "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            ].join(" ")}
          >
            <button
              type="button"
              disabled={!playable}
              title={active && isPlaying ? "Pause" : "Play now"}
              onClick={handlePlayClick}
              className={[
                "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition hover:scale-105",
                accent.btn,
                accent.focusRing,
                "focus:outline-none focus-visible:ring-2",
                !playable ? "cursor-not-allowed opacity-40" : "",
              ].join(" ")}
            >
              {active && isPlaying ? <IconPause className="h-6 w-6" /> : <IconPlay className="h-6 w-6 pl-0.5" />}
            </button>
          </div>

          <div className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-200 backdrop-blur-sm">
            {formatDuration(duration)}
          </div>
        </div>
      ) : (
        <div className={`flex items-center justify-between border-b border-white/[0.06] ${pad}`}>
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent.gradient} text-lg text-white shadow-md`}>
            ♪
          </div>
          <button
            type="button"
            disabled={!playable}
            title="Play"
            onClick={handlePlayClick}
            className={`rounded-full px-4 py-2 text-xs font-bold shadow-md transition hover:scale-105 ${accent.btn} disabled:opacity-40`}
          >
            {active && isPlaying ? "Pause" : "Play"}
          </button>
        </div>
      )}

      <div className={`flex flex-1 flex-col ${pad}`}>
        <div className="min-w-0 space-y-1">
          <h3 className={`truncate font-semibold tracking-tight text-current ${titleCls}`} title={title}>
            {title}
          </h3>
          <p className="truncate text-xs text-current/55" title={artist}>
            {artist}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!playable}
            title="Play or pause"
            onClick={handlePlayClick}
            className={[
              `inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition hover:scale-[1.02] ${accent.btnMuted} border border-white/[0.08]`,
              !playable ? "cursor-not-allowed opacity-40" : "",
            ].join(" ")}
          >
            {active && isPlaying ? (
              <>
                <IconPause className="h-4 w-4" /> Pause
              </>
            ) : (
              <>
                <IconPlay className="h-4 w-4" /> Play
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleLikeClick}
            title={liked ? "Unlike" : "Save to Liked"}
            className={[
              "inline-flex h-10 w-10 items-center justify-center rounded-lg border transition hover:scale-105",
              liked ? "border-rose-500/40 bg-rose-500/15 text-rose-300" : `${accent.btnMuted} border border-white/[0.08] text-current/60`,
            ].join(" ")}
          >
            <IconHeart className="h-5 w-5" filled={liked} />
          </button>

          <button
            type="button"
            onClick={handleQueueClick}
            disabled={!playable}
            title="Queue next"
            className={[
              `inline-flex h-10 w-10 items-center justify-center rounded-lg border transition hover:scale-105 ${accent.btnMuted} border border-white/[0.08] text-current/80`,
              !track ? "cursor-not-allowed opacity-40" : "",
            ].join(" ")}
          >
            <IconQueueAdd className="h-5 w-5" />
          </button>
        </div>

        {!playable && <p className="text-[11px] text-amber-500/90">No stream — can’t play this one</p>}
      </div>
    </article>
  );
}
