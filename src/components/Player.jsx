import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useThemeAccent } from "../context/ThemeAccentContext";
import { loadAppSettings } from "../utils/appSettings";

/**
 * Player — glass “now playing” strip + transport + seek + volume.
 *
 * Spatial audio (Settings → “Widen stereo image”):
 * - When enabled, we create a **one-time** Web Audio graph:
 *   `MediaElementSource → StereoPanner → Gain → Destination`.
 * - `HTMLMediaElement` audio is then routed **only** through the graph; loudness is driven by the GainNode.
 *   `PlayerContext` skips `audio.volume` when `dataset.spatialWired === "1"` to avoid double attenuation.
 * - If the user turns spatial **off** after the graph exists, we cannot safely disconnect the
 *   `MediaElementSource` (browser limitation per element); we simply center the panner and stop motion.
 *
 * Progress + shortcuts behavior is unchanged from `PlayerContext` docs.
 */

function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function IconPrev({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 6h2v12H6V6Zm12 0-8 6 8 6V6Z" />
    </svg>
  );
}

function IconNext({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 18 14 12 6 6v12Zm8-12h2v12h-2V6Z" />
    </svg>
  );
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

function IconShuffle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20l7.5-7.5M4 4l7.5 7.5M21 16v5h-5" />
    </svg>
  );
}

function IconRepeat({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function IconVolume({ className, level }) {
  const muted = level === 0;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      {muted ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9l4 4m0-4-4 4M6 9H4v6h2l4 4V5L6 9Z" />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H4v6h2l5 4V5Z" />
          <path strokeLinecap="round" d="M15.54 8.46a5 5 0 0 1 0 7.07M17.66 6.34a8 8 0 0 1 0 11.32" className={level < 0.5 ? "opacity-40" : ""} />
        </>
      )}
    </svg>
  );
}

export default function Player() {
  const accent = useThemeAccent();
  const {
    audioRef,
    currentSong,
    isPlaying,
    togglePlayPause,
    next,
    previous,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    volume,
    setVolume,
    toggleMute,
    isMuted,
    advanceAfterTrackEnded,
  } = usePlayer();

  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [spatialWide, setSpatialWide] = useState(() => Boolean(loadAppSettings().spatialAudio));

  const scrubbingRef = useRef(false);
  const trackRef = useRef(null);

  /** Holds Web Audio nodes once `createMediaElementSource` succeeds — must not be recreated per MDN rules. */
  const graphRef = useRef(null);
  const panPhaseRef = useRef(0);
  const panRafRef = useRef(0);

  useEffect(() => {
    const onSettings = () => setSpatialWide(Boolean(loadAppSettings().spatialAudio));
    window.addEventListener("utopian-settings-updated", onSettings);
    return () => window.removeEventListener("utopian-settings-updated", onSettings);
  }, []);

  /**
   * Build the audio graph the first time spatial mode is requested while the `<audio>` element exists.
   * After wiring, `audio.dataset.spatialWired` flags `PlayerContext` to leave `element.volume` at 1 and
   * let this GainNode carry the fader.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || graphRef.current || !spatialWide) return;

    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    try {
      const ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      const panner = ctx.createStereoPanner();
      const gain = ctx.createGain();
      src.connect(panner);
      panner.connect(gain);
      gain.connect(ctx.destination);

      audio.volume = 1;
      audio.dataset.spatialWired = "1";

      graphRef.current = { ctx, panner, gain };
    } catch {
      // Older browsers / autoplay policies — fall back silently to normal element playback.
    }
  }, [audioRef, spatialWide, currentSong]);

  /** Drive output level through the GainNode when wired; `isMuted` maps to 0 gain. */
  useEffect(() => {
    const g = graphRef.current?.gain;
    if (!g) return;
    const v = isMuted ? 0 : volume;
    try {
      g.gain.setValueAtTime(v, g.context.currentTime);
    } catch {
      g.gain.value = v;
    }
  }, [volume, isMuted]);

  /** Gentle stereo motion while “spatial” is enabled; centered static pan when disabled but graph remains. */
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph?.panner) return;

    const cancelRaf = () => {
      if (panRafRef.current) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = 0;
      }
    };

    if (!spatialWide) {
      cancelRaf();
      graph.panner.pan.value = 0;
      return cancelRaf;
    }

    const tick = () => {
      panPhaseRef.current += 0.018;
      const wobble = Math.sin(panPhaseRef.current) * 0.22;
      graph.panner.pan.value = wobble;
      panRafRef.current = requestAnimationFrame(tick);
    };
    cancelRaf();
    panRafRef.current = requestAnimationFrame(tick);
    return () => cancelRaf();
  }, [spatialWide, currentSong?.id]);

  /** Unlock AudioContext after a user-driven play gesture. */
  useEffect(() => {
    const ctx = graphRef.current?.ctx;
    if (!ctx || !isPlaying) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }, [isPlaying, currentSong?.id]);

  const title = currentSong?.title || currentSong?.name || "Nothing playing";
  const artist = currentSong?.artist || currentSong?.primaryArtists || "—";
  const image = currentSong?.image || "";

  const progress = useMemo(() => {
    if (!durationSec || durationSec <= 0) return 0;
    return Math.min(1, Math.max(0, currentTimeSec / durationSec));
  }, [currentTimeSec, durationSec]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const sync = () => {
      setCurrentTimeSec(audio.currentTime || 0);
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) setDurationSec(d);
    };

    const onMeta = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) setDurationSec(d);
      setCurrentTimeSec(audio.currentTime || 0);
    };

    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("seeked", sync);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);

    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("seeked", sync);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
    };
  }, [audioRef, currentSong]);

  useEffect(() => {
    setCurrentTimeSec(0);
    setDurationSec(0);
  }, [currentSong?.id]);

  const seekToRatio = useCallback(
    (ratio) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(durationSec) || durationSec <= 0) return;
      const nextTime = Math.min(durationSec, Math.max(0, ratio * durationSec));
      audio.currentTime = nextTime;
      setCurrentTimeSec(nextTime);
    },
    [audioRef, durationSec]
  );

  const seekToClientX = useCallback(
    (clientX) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      seekToRatio(Math.min(1, Math.max(0, ratio)));
    },
    [seekToRatio]
  );

  useEffect(() => {
    const onMove = (e) => {
      if (!scrubbingRef.current) return;
      seekToClientX(e.clientX);
    };
    const onUp = () => {
      scrubbingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [seekToClientX]);

  const onTrackPointerDown = (e) => {
    e.preventDefault();
    scrubbingRef.current = true;
    seekToClientX(e.clientX);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const cycleRepeat = () => {
    const order = ["off", "all", "one"];
    const i = order.indexOf(repeat);
    setRepeat(order[(i + 1) % order.length]);
  };

  const repeatLabel =
    repeat === "off" ? "Repeat off" : repeat === "all" ? "Repeat queue" : "Repeat one";

  return (
    <div className="w-full">
      <audio
        ref={audioRef}
        preload="metadata"
        onEnded={advanceAfterTrackEnded}
        className="hidden"
        aria-hidden
      />

      <div
        className={[
          "rounded-2xl border border-white/[0.08] bg-zinc-950/55 p-4 shadow-2xl shadow-black/40",
          "backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300",
          "ring-1 ring-inset ring-white/[0.04]",
          spatialWide ? "shadow-[0_0_32px_-10px_rgba(255,255,255,0.12)]" : "",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10 transition duration-300 hover:ring-current/25 lg:mx-0 lg:h-32 lg:w-32">
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${accent.gradient} text-3xl text-white/70`}>
                ♪
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-0.5 text-center lg:text-left">
              <h2 className="truncate text-base font-semibold tracking-tight text-current" title={title}>
                {title}
              </h2>
              <p className="truncate text-sm text-current/55" title={artist}>
                {artist}
              </p>
            </div>

            <div className="space-y-1.5">
              <div
                ref={trackRef}
                role="slider"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-label="Seek position"
                className={`group relative h-2 w-full cursor-pointer rounded-full bg-white/[0.06] outline-none transition-all duration-200 hover:bg-white/[0.09] focus-visible:ring-2 ${accent.focusRing}`}
                onPointerDown={onTrackPointerDown}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    const audio = audioRef.current;
                    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 5);
                  }
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    const audio = audioRef.current;
                    if (audio && durationSec) {
                      audio.currentTime = Math.min(durationSec, audio.currentTime + 5);
                    }
                  }
                }}
              >
                <div
                  className={`pointer-events-none absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${accent.gradient} transition-[width] duration-75 ease-linear`}
                  style={{ width: `${progress * 100}%` }}
                />
                <div
                  className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                  style={{ left: `calc(${progress * 100}% - 6px)` }}
                />
              </div>
              <div className="flex justify-between text-[11px] tabular-nums text-current/45">
                <span>{formatTime(currentTimeSec)}</span>
                <span>{formatTime(durationSec)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <button
                type="button"
                onClick={() => setShuffle(!shuffle)}
                title={shuffle ? "Shuffle on — surprise order" : "Shuffle off — play in list order"}
                className={[
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200",
                  shuffle ? `border-current/25 ${accent.chip} shadow-md` : `${accent.btnMuted} border border-white/[0.08] hover:scale-105`,
                ].join(" ")}
              >
                <IconShuffle className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={previous}
                title="Previous track (or restart if past 3s)"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-current transition-all duration-200 hover:scale-105 hover:bg-white/[0.08] ${accent.btnMuted}`}
              >
                <IconPrev className="h-6 w-6" />
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                title={isPlaying ? "Pause" : "Play"}
                disabled={!currentSong}
                className={[
                  "inline-flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-[1.05]",
                  accent.btn,
                  !currentSong ? "cursor-not-allowed opacity-40" : "",
                ].join(" ")}
              >
                {isPlaying ? <IconPause className="h-7 w-7" /> : <IconPlay className="h-7 w-7 pl-0.5" />}
              </button>

              <button
                type="button"
                onClick={next}
                title="Skip to next track"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-current transition-all duration-200 hover:scale-105 hover:bg-white/[0.08] ${accent.btnMuted}`}
              >
                <IconNext className="h-6 w-6" />
              </button>

              <button
                type="button"
                onClick={cycleRepeat}
                title={`${repeatLabel} — click to cycle`}
                className={[
                  "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200",
                  repeat !== "off" ? `border-current/25 ${accent.chip} shadow-md` : `${accent.btnMuted} border border-white/[0.08] hover:scale-105`,
                ].join(" ")}
              >
                <IconRepeat className="h-5 w-5" />
                {repeat === "one" && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-0.5 text-[9px] font-bold leading-none text-current">
                    1
                  </span>
                )}
              </button>
            </div>

            <p className="text-center text-[10px] text-current/45 lg:text-left">
              Space play · arrows seek · M mute{spatialWide ? " · wide stage on" : ""}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 border-t border-white/[0.06] pt-4 lg:w-48 lg:flex-col lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? "Unmute audio" : "Mute audio"}
              className="rounded-lg p-2 text-current/50 transition-all duration-200 hover:scale-105 hover:bg-white/[0.06] hover:text-current"
            >
              <IconVolume className="h-6 w-6" level={isMuted ? 0 : volume} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              title="Volume level"
              className="utopian-range h-1.5 w-full max-w-[200px] cursor-pointer appearance-none rounded-full bg-white/[0.08] lg:max-w-none"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
