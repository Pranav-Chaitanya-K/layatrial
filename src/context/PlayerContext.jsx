import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadAppSettings } from "../utils/appSettings";

/**
 * localStorage keys for persistence across sessions.
 * Keep these stable so upgrades do not orphan user data.
 */
const STORAGE_KEYS = {
  LIKED: "utopian-music-liked-songs",
  RECENT: "utopian-music-recent-songs",
};

/** Max songs to keep in "recently played" (newest first). */
const MAX_RECENT = 50;

/** Seconds to seek when using Left/Right arrow keys. */
const SEEK_STEP_SECONDS = 10;

/**
 * Safely read JSON array from localStorage.
 * Returns fallback if missing or invalid.
 */
function loadJsonArray(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Persist array to localStorage (liked / recent lists).
 */
function saveJsonArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode — ignore; in-memory state still works for the session.
  }
}

/**
 * Stable identity for a track (APIs may use different field names).
 */
function songKey(song) {
  if (!song || typeof song !== "object") return "";
  return String(song.id ?? song.songid ?? song.url ?? "").trim();
}

/**
 * Whether two songs refer to the same track.
 */
function sameSong(a, b) {
  const ka = songKey(a);
  const kb = songKey(b);
  if (ka && kb && ka === kb) return true;
  if (a?.url && b?.url && a.url === b.url) return true;
  return false;
}

/**
 * Append a song to "recently played": dedupe by identity, cap length, persist.
 */
function pushRecent(prev, song) {
  if (!song) return prev;
  const without = prev.filter((s) => !sameSong(s, song));
  const next = [song, ...without].slice(0, MAX_RECENT);
  saveJsonArray(STORAGE_KEYS.RECENT, next);
  return next;
}

const PlayerContext = createContext(null);

/**
 * PlayerProvider — central place for playback, queue, likes, recents, and shortcuts.
 *
 * Children should render a single <audio ref={audioRef} /> (e.g. in Player.jsx)
 * so play/pause/seek and next/prev can control real audio.
 */
export function PlayerProvider({ children }) {
  const prefs0 = loadAppSettings();

  /** Ref to the HTML <audio> element (must be wired in the Player component). */
  const audioRef = useRef(null);

  /** Ordered list of tracks waiting to play (and the current track lives inside this list at currentIndex). */
  const [queue, setQueue] = useState([]);

  /** Index in `queue` of the track currently loaded / playing. */
  const [currentIndex, setCurrentIndex] = useState(0);

  /** Mirrors whether audio is actively playing (also driven by play/pause events if you sync in Player). */
  const [isPlaying, setIsPlaying] = useState(false);

  /** 0–1 linear volume; 0 means silent (mute toggle sets last non-zero volume in ref below). */
  const [volume, setVolumeState] = useState(() =>
    typeof prefs0.defaultVolume === "number"
      ? Math.max(0, Math.min(1, prefs0.defaultVolume))
      : 1
  );

  /** When true, "next" picks a random index in the queue (excluding current if possible). */
  const [shuffle, setShuffle] = useState(() => Boolean(prefs0.defaultShuffle));

  /**
   * Repeat behavior:
   * - "off" — stop at end of queue (or stop after one if single)
   * - "all" — after last song, wrap to first
   * - "one" — repeat the same track when it ends (handled by consumer on `ended` or here in next)
   */
  const [repeat, setRepeat] = useState(() =>
    ["off", "all", "one"].includes(prefs0.defaultRepeat) ? prefs0.defaultRepeat : "off"
  );

  /** Apply Settings page changes (same tab) without full reload. */
  useEffect(() => {
    const sync = () => {
      const p = loadAppSettings();
      if (typeof p.defaultVolume === "number") {
        setVolumeState(Math.max(0, Math.min(1, p.defaultVolume)));
      }
      setShuffle(Boolean(p.defaultShuffle));
      if (["off", "all", "one"].includes(p.defaultRepeat)) {
        setRepeat(p.defaultRepeat);
      }
    };
    window.addEventListener("utopian-settings-updated", sync);
    return () => window.removeEventListener("utopian-settings-updated", sync);
  }, []);

  /** Liked tracks (full objects as returned by API), persisted. */
  const [likedSongs, setLikedSongs] = useState(() =>
    loadJsonArray(STORAGE_KEYS.LIKED, [])
  );

  /** Recently played tracks (newest first), persisted. */
  const [recentSongs, setRecentSongs] = useState(() =>
    loadJsonArray(STORAGE_KEYS.RECENT, [])
  );

  /** Remember volume before mute so "unmute" restores it. */
  const volumeBeforeMuteRef = useRef(1);

  /** Current track object derived from queue + index. */
  const currentSong =
    queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length
      ? queue[currentIndex]
      : null;

  /** Persist liked list whenever it changes. */
  useEffect(() => {
    saveJsonArray(STORAGE_KEYS.LIKED, likedSongs);
  }, [likedSongs]);

  /** Resolve stream URL from common API shapes. */
  const getStreamUrl = useCallback((song) => {
    if (!song) return "";
    return (
      song.url ||
      song.audioUrl ||
      song.media_url ||
      song.downloadUrl?.[0]?.url ||
      song.download_url ||
      ""
    );
  }, []);

  /**
   * Load current song into <audio> when track or queue changes.
   * Actual playback is triggered by isPlaying / user actions.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const url = getStreamUrl(currentSong);
    if (url && audio.src !== url) {
      audio.src = url;
      audio.load();
    }
  }, [currentSong, getStreamUrl]);

  /**
   * When isPlaying becomes true, call play(); when false, pause().
   * Components can also call audio.play() after gesture; this keeps state in sync.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const run = async () => {
      try {
        if (isPlaying) {
          await audio.play();
        } else {
          audio.pause();
        }
      } catch {
        setIsPlaying(false);
      }
    };
    run();
  }, [isPlaying, currentSong]);

  /**
   * Apply volume to the `<audio>` element.
   * When `Player.jsx` wires Web Audio (`dataset.spatialWired === "1"`), loudness is driven by a
   * GainNode — skip mutating `audio.volume` so we do not double-attenuate.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.dataset.spatialWired === "1") return;
    audio.volume = volume;
  }, [volume]);

  /** Add/update recent when the active song changes. */
  useEffect(() => {
    if (!currentSong) return;
    setRecentSongs((prev) => pushRecent(prev, currentSong));
  }, [currentSong]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, Number(v) || 0));
    setVolumeState(clamped);
    if (clamped > 0) volumeBeforeMuteRef.current = clamped;
  }, []);

  /** Mute: volume 0; unmute: restore previous non-zero volume. */
  const toggleMute = useCallback(() => {
    setVolumeState((prev) => {
      if (prev > 0) {
        volumeBeforeMuteRef.current = prev;
        return 0;
      }
      return volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : 0.8;
    });
  }, []);

  const isMuted = volume === 0;

  /**
   * Pick next index: shuffle, repeat-one (only when track *ends*), or sequential + repeat-all.
   * @param {{ manual?: boolean }} opts — manual button skips repeat-one (still advances).
   */
  const resolveNextIndex = useCallback(
    (opts = {}) => {
      const manual = opts.manual === true;
      if (queue.length === 0) return -1;
      if (!manual && repeat === "one") return currentIndex;

      if (shuffle && queue.length > 1) {
        let next = currentIndex;
        let guard = 0;
        while (next === currentIndex && guard < 32) {
          next = Math.floor(Math.random() * queue.length);
          guard++;
        }
        return next;
      }

      if (currentIndex < queue.length - 1) return currentIndex + 1;
      if (repeat === "all") return 0;
      return -1;
    },
    [queue.length, currentIndex, repeat, shuffle]
  );

  const resolvePrevIndex = useCallback(() => {
    if (queue.length === 0) return -1;
    if (currentIndex > 0) return currentIndex - 1;
    if (repeat === "all") return queue.length - 1;
    return -1;
  }, [queue.length, currentIndex, repeat]);

  /** Advance to next track (manual control / UI); repeat-one does not block skipping. */
  const next = useCallback(() => {
    const nextIdx = resolveNextIndex({ manual: true });
    if (nextIdx < 0) {
      setIsPlaying(false);
      return;
    }
    setCurrentIndex(nextIdx);
  }, [resolveNextIndex]);

  /**
   * Call from `<audio onEnded>`: repeat-one replays; otherwise advances like auto-next.
   * Re-starts the same file when repeat-one without changing queue index.
   */
  const advanceAfterTrackEnded = useCallback(() => {
    if (repeat === "one") {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => setIsPlaying(false));
      }
      return;
    }
    const nextIdx = resolveNextIndex({ manual: false });
    if (nextIdx < 0) {
      setIsPlaying(false);
      return;
    }
    setCurrentIndex(nextIdx);
  }, [repeat, resolveNextIndex]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    /** If user seeks back within first few seconds, go to previous song; else restart current. */
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prevIdx = resolvePrevIndex();
    if (prevIdx < 0) {
      return;
    }
    setCurrentIndex(prevIdx);
  }, [resolvePrevIndex]);

  /**
   * Seek by delta seconds (positive = forward), clamped to [0, duration].
   */
  const seekBy = useCallback((deltaSeconds) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(deltaSeconds)) return;
    const next = Math.max(
      0,
      Math.min(
        audio.duration && Number.isFinite(audio.duration)
          ? audio.duration
          : Infinity,
        audio.currentTime + deltaSeconds
      )
    );
    audio.currentTime = next;
  }, []);

  /**
   * Add one or more songs to the end of the queue.
   * If queue was empty, starts at index 0.
   */
  const addToQueue = useCallback((songs) => {
    const list = Array.isArray(songs) ? songs : [songs];
    setQueue((q) => {
      const next = [...q, ...list.filter(Boolean)];
      if (q.length === 0 && next.length > 0) setCurrentIndex(0);
      return next;
    });
  }, []);

  /**
   * Replace queue and optionally start at an index (default 0).
   */
  const setQueueAndPlay = useCallback((songs, startIndex = 0) => {
    const list = Array.isArray(songs) ? songs.filter(Boolean) : [];
    setQueue(list);
    const idx = Math.max(0, Math.min(list.length - 1, startIndex));
    setCurrentIndex(list.length ? idx : 0);
    if (list.length) setIsPlaying(true);
  }, []);

  /** Remove one item by index; adjusts currentIndex if needed. */
  const removeFromQueue = useCallback((index) => {
    setQueue((q) => {
      const next = q.filter((_, i) => i !== index);
      setCurrentIndex((ci) => {
        if (next.length === 0) return 0;
        if (index < ci) return ci - 1;
        if (index === ci) return Math.min(ci, next.length - 1);
        return ci;
      });
      if (next.length === 0) setIsPlaying(false);
      return next;
    });
  }, []);

  /**
   * Move item from `fromIndex` to `toIndex` (0-based).
   * Updates currentIndex so the same track stays "now playing" after the move.
   */
  const reorderQueue = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    setQueue((q) => {
      if (fromIndex >= q.length || toIndex >= q.length) return q;
      const copy = [...q];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);

      setCurrentIndex((ci) => {
        if (ci === fromIndex) return toIndex;
        if (fromIndex < toIndex) {
          if (ci > fromIndex && ci <= toIndex) return ci - 1;
        } else {
          if (ci >= toIndex && ci < fromIndex) return ci + 1;
        }
        return ci;
      });

      return copy;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  /** Wipe “recently played” (privacy) — persists empty array to localStorage. */
  const clearRecentHistory = useCallback(() => {
    setRecentSongs([]);
    saveJsonArray(STORAGE_KEYS.RECENT, []);
  }, []);

  /** True if this song is in the liked list. */
  const isLiked = useCallback(
    (song) => {
      if (!song) return false;
      return likedSongs.some((s) => sameSong(s, song));
    },
    [likedSongs]
  );

  /** Add or remove from liked; persists via useEffect on likedSongs. */
  const toggleLike = useCallback((song) => {
    if (!song) return;
    setLikedSongs((prev) => {
      const exists = prev.some((s) => sameSong(s, song));
      if (exists) return prev.filter((s) => !sameSong(s, song));
      return [...prev, song];
    });
  }, []);

  /**
   * Keyboard shortcuts (global):
   * - Space: play/pause (ignored when typing in inputs)
   * - ArrowLeft / ArrowRight: seek
   * - M: mute toggle
   */
  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const tag = target?.tagName?.toLowerCase();
      const editable =
        target?.isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";

      if (editable) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekBy(-SEEK_STEP_SECONDS);
        return;
      }

      if (e.code === "ArrowRight") {
        e.preventDefault();
        seekBy(SEEK_STEP_SECONDS);
        return;
      }

      if (e.code === "KeyM" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlayPause, seekBy, toggleMute]);

  const value = useMemo(
    () => ({
      // Ref for <audio />
      audioRef,

      // Playback
      currentSong,
      isPlaying,
      volume,
      isMuted,
      shuffle,
      repeat,

      setShuffle,
      setRepeat,
      play,
      pause,
      togglePlayPause,
      setVolume,
      toggleMute,
      next,
      previous,
      seekBy,
      advanceAfterTrackEnded,

      // Queue
      queue,
      currentIndex,
      setCurrentIndex,
      addToQueue,
      setQueueAndPlay,
      removeFromQueue,
      reorderQueue,
      clearQueue,

      // Library
      likedSongs,
      recentSongs,
      isLiked,
      toggleLike,
      clearRecentHistory,

      // Helpers for Player.jsx (optional)
      getStreamUrl,
    }),
    [
      currentSong,
      isPlaying,
      volume,
      isMuted,
      shuffle,
      repeat,
      play,
      pause,
      togglePlayPause,
      setVolume,
      toggleMute,
      next,
      previous,
      seekBy,
      advanceAfterTrackEnded,
      queue,
      currentIndex,
      addToQueue,
      setQueueAndPlay,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      likedSongs,
      recentSongs,
      isLiked,
      toggleLike,
      clearRecentHistory,
      getStreamUrl,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

/**
 * Hook to consume player context; throws if used outside PlayerProvider.
 */
export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return ctx;
}

export default PlayerContext;
