/**
 * Music metadata + stream URLs from JioSaavn-compatible HTTP APIs.
 *
 * Strategy:
 * 1. PRIMARY — `saavn.me`-style public mirror (same route shape as many community APIs).
 * 2. FALLBACK — `jiosaavn-api-cyan-theta.vercel.app` (OpenAPI-documented, CORS-friendly on Vercel).
 *
 * `getTrendingSongs` fans out across **multiple discovery queries** (artists / film OST — not the word “trending”),
 * merges, filters junk titles, then ranks known Indian playback stars slightly higher.
 */

import { buildTrendingDiscoveryQueries } from "../utils/appSettings";

/** Saavn-style mirror (try first). */
const PRIMARY_BASE = "https://saavn.me";

/**
 * Documented REST API (fallback). Same paths as PRIMARY where possible.
 * @see https://jiosaavn-api-cyan-theta.vercel.app/docs
 */
const FALLBACK_BASE = "https://jiosaavn-api-cyan-theta.vercel.app";

/** Default request timeout — avoids hanging UI on slow networks. */
const DEFAULT_TIMEOUT_MS = 18_000;

/** Default page size when callers omit `limit`. */
const DEFAULT_SEARCH_LIMIT = 28;

/**
 * Drop low-signal tracks whose *title* is literally “trending” (common API pollution).
 */
function isJunkTrendingTitle(song) {
  const raw = (song?.title || "").trim();
  const t = raw.toLowerCase();
  if (!t) return true;
  if (t === "trending" || /^trending[!\s]*$/i.test(raw)) return true;
  if (t.startsWith("trending") && t.length < 16 && !/\w{4,}/.test(t.slice(8))) return true;
  return false;
}

/** Soft boost for household-name artists / composers (Indian film + indie). */
const FAMOUS_ARTIST_RE =
  /arijit|shreya|pritam|rahman|anirudh|diljit|badshah|atif|neha|jubin|sid sriram|honey singh|karan aujla|sonu nigam|kishore|ar rehman|pritam|irshad|amit trivedi|vishal mishra|javed ali|palak muchhal|neha kakkar|emraan|kk singer|ram sampath|vishal dadlani|shaan|udit|kumar sanu/i;

function artistBoostScore(song) {
  const blob = `${song?.artist || ""} ${song?.title || ""}`;
  return FAMOUS_ARTIST_RE.test(blob) ? 1 : 0;
}

/** API per-request cap (mirrors often accept ~50). */
const MAX_LIMIT_PER_REQUEST = 50;

/**
 * @typedef {Object} NormalizedSong
 * @property {string} id
 * @property {string} title
 * @property {string} artist
 * @property {string} image
 * @property {string} audioUrl
 * @property {number} duration — seconds (0 if unknown)
 */

// ---------------------------------------------------------------------------
// Low-level HTTP
// ---------------------------------------------------------------------------

/**
 * Abortable `fetch` with timeout — treats slow networks as failures so the caller can fall back.
 */
async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetch(url, {
      ...options,
      signal: ctrl.signal,
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
    const loadTimeMs = Math.round(performance.now() - started);
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Invalid JSON (${res.status})`);
    }
    if (!res.ok) {
      throw new Error(data?.message || `HTTP ${res.status}`);
    }
    return { data, loadTimeMs };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Response extraction (multiple API shapes)
// ---------------------------------------------------------------------------

/** Pull an array of raw song objects from heterogeneous JSON. */
function extractRawSongArrays(payload) {
  if (!payload || typeof payload !== "object") return [];

  const candidates = [];

  if (Array.isArray(payload)) {
    candidates.push(payload);
  }

  const d = payload.data;
  if (d && typeof d === "object") {
    if (Array.isArray(d)) {
      candidates.push(d);
    }
    if (Array.isArray(d.results)) candidates.push(d.results);
    if (d.songs && Array.isArray(d.songs.results)) candidates.push(d.songs.results);
    if (d.topQuery && Array.isArray(d.topQuery.results)) candidates.push(d.topQuery.results);
    if (Array.isArray(d.songs)) candidates.push(d.songs);
  }

  if (Array.isArray(payload.results)) candidates.push(payload.results);
  if (Array.isArray(payload.songs)) candidates.push(payload.songs);

  return candidates.filter((a) => a.length > 0);
}

/** First non-empty raw song list wins. */
function firstSongList(json) {
  const lists = extractRawSongArrays(json);
  return lists.length ? lists[0] : [];
}

// ---------------------------------------------------------------------------
// Normalization → { id, title, artist, image, audioUrl, duration }
// ---------------------------------------------------------------------------

function pickImage(raw) {
  if (!raw || typeof raw !== "object") return "";
  if (typeof raw.image === "string") {
    return raw.image.replace(/150x150|50x50/g, "500x500");
  }
  if (Array.isArray(raw.image) && raw.image.length) {
    const preferred =
      raw.image.find((x) => /500x500|high/i.test(x.quality || "")) ||
      raw.image[raw.image.length - 1];
    return preferred?.url || "";
  }
  return "";
}

/**
 * Prefer highest-quality entry when API returns `downloadUrl` tiers.
 */
function pickAudioUrl(raw) {
  if (!raw || typeof raw !== "object") return "";
  const arr = raw.downloadUrl;
  if (Array.isArray(arr) && arr.length) {
    const last = arr[arr.length - 1];
    return last?.url || "";
  }
  return (
    raw.media_url ||
    raw.mediaUrl ||
    (Array.isArray(raw.download_url) && raw.download_url[0]?.url) ||
    ""
  );
}

function pickArtist(raw) {
  if (!raw || typeof raw !== "object") return "Unknown artist";
  if (typeof raw.primaryArtists === "string" && raw.primaryArtists.trim()) {
    return raw.primaryArtists.trim();
  }
  if (typeof raw.primary_artists === "string" && raw.primary_artists.trim()) {
    return raw.primary_artists.trim();
  }
  if (typeof raw.singers === "string" && raw.singers.trim()) return raw.singers.trim();
  const prim = raw.artists?.primary;
  if (Array.isArray(prim) && prim.length) {
    return prim
      .map((a) => a.name)
      .filter(Boolean)
      .join(", ");
  }
  return "Unknown artist";
}

function pickTitle(raw) {
  return (
    (typeof raw.name === "string" && raw.name) ||
    (typeof raw.title === "string" && raw.title) ||
    (typeof raw.song === "string" && raw.song) ||
    "Untitled"
  );
}

function pickDurationSeconds(raw) {
  const d = raw?.duration;
  if (d == null) return 0;
  const n = Number(d);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/**
 * Map one API record to the app's canonical song shape.
 */
export function normalizeSong(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      title: "Untitled",
      artist: "Unknown artist",
      image: "",
      audioUrl: "",
      duration: 0,
    };
  }
  const id = String(raw.id ?? raw.songid ?? "");
  return {
    id,
    title: pickTitle(raw),
    artist: pickArtist(raw),
    image: pickImage(raw),
    audioUrl: pickAudioUrl(raw),
    duration: pickDurationSeconds(raw),
  };
}

function normalizeList(rawSongs) {
  if (!Array.isArray(rawSongs) || rawSongs.length === 0) return [];
  return rawSongs.map(normalizeSong).filter((s) => s.id);
}

function mergeUniqueById(lists, maxLen) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const s of list) {
      if (!s?.id || seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
      if (out.length >= maxLen) return out;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discovery feed: parallel searches from `buildTrendingDiscoveryQueries` (Settings languages + global blend).
 *
 * @param {object} [options]
 * @param {string[]} [options.languagePreferences] — drives query mix from `../utils/appSettings`
 * @param {string[]} [options.searchQueries] — optional override
 * @param {number} [options.targetCount=96]
 */
export async function getTrendingSongs(options = {}) {
  const targetCount = Math.min(120, Math.max(36, Number(options.targetCount) || 96));
  const queries =
    Array.isArray(options.searchQueries) && options.searchQueries.length
      ? options.searchQueries
      : buildTrendingDiscoveryQueries(options.languagePreferences);

  const cappedQueries = queries.slice(0, 8);
  const perQLimit = Math.min(
    MAX_LIMIT_PER_REQUEST,
    Math.max(10, Math.ceil((targetCount * 1.2) / Math.max(1, cappedQueries.length)))
  );

  const batches = await Promise.all(
    cappedQueries.map((q) => searchSongsInternal(q, { limit: perQLimit }))
  );

  const lists = batches.map((b) =>
    (b.songs || []).filter((s) => s?.id && !isJunkTrendingTitle(s))
  );

  const merged = mergeUniqueById(lists, Math.min(targetCount * 2, 220));
  const ranked = merged.map((s, idx) => ({ s, idx, b: artistBoostScore(s) }));
  ranked.sort((a, b) => {
    if (b.b !== a.b) return b.b - a.b;
    return a.idx - b.idx;
  });
  const songs = ranked.map((x) => x.s).slice(0, targetCount);

  const anySource = batches.find((b) => b.songs?.length)?.source || null;
  const err = batches.map((b) => b.error).filter(Boolean);

  return {
    songs,
    source: songs.length ? anySource : null,
    error: songs.length ? null : err.join(" · ") || "Nothing turned up — try again soon.",
    loadTimeMs: batches[batches.length - 1]?.loadTimeMs || batches[0]?.loadTimeMs || 0,
  };
}

/**
 * Full-text search. Empty `query` returns empty list quickly (no network).
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
export async function searchSongs(query, opts = {}) {
  const q = String(query ?? "").trim();
  if (!q) {
    return {
      songs: [],
      source: null,
      error: null,
      loadTimeMs: 0,
    };
  }
  return searchSongsInternal(q, { limit: opts.limit });
}

/**
 * Shared search implementation: `/api/search/songs?query=&limit=`
 *
 * Tries PRIMARY, then FALLBACK on the same path if the first call fails or returns no songs.
 */
async function searchSongsInternal(query, opts = {}) {
  const limit = Math.min(
    MAX_LIMIT_PER_REQUEST,
    Math.max(4, Number(opts.limit) || DEFAULT_SEARCH_LIMIT)
  );
  const path = `/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}&page=0`;

  const errors = [];
  for (const [label, base] of [
    ["primary", PRIMARY_BASE],
    ["fallback", FALLBACK_BASE],
  ]) {
    try {
      const { data, loadTimeMs } = await fetchJson(`${base}${path}`);
      const rawList = firstSongList(data);
      const songs = normalizeList(rawList);
      if (songs.length > 0) {
        return {
          songs,
          source: label,
          error: null,
          loadTimeMs,
        };
      }
      errors.push(`${label}: empty results`);
    } catch (e) {
      const msg = e?.name === "AbortError" ? "timed out" : e?.message || String(e);
      errors.push(`${label}: ${msg}`);
    }
  }

  /** Last resort: global search on fallback (aggregates songs + albums + top queries). */
  const fallbackGlobal = await tryFallbackGlobalSearch(query);
  if (fallbackGlobal.songs.length) {
    return fallbackGlobal;
  }

  return {
    songs: [],
    source: null,
    error: errors.join(" → ") || "No songs found for this query",
    loadTimeMs: fallbackGlobal.loadTimeMs,
  };
}

/**
 * Fallback: global search aggregates songs + albums; grab `data.songs.results`.
 */
async function tryFallbackGlobalSearch(query) {
  const url = `${FALLBACK_BASE}/api/search?query=${encodeURIComponent(query)}`;
  try {
    const { data, loadTimeMs } = await fetchJson(url);
    const rawList =
      data?.data?.songs?.results ||
      data?.data?.topQuery?.results ||
      [];
    const songs = normalizeList(rawList);
    return {
      songs,
      source: songs.length ? "fallback" : null,
      error: songs.length ? null : "No songs in global search",
      loadTimeMs,
    };
  } catch (e) {
    return {
      songs: [],
      source: null,
      error: e?.message || String(e),
      loadTimeMs: 0,
    };
  }
}

/**
 * Resolve a single track by id — tries path variants on PRIMARY, then FALLBACK.
 */
export async function getSongDetails(id) {
  const sid = String(id ?? "").trim();
  if (!sid) {
    return { song: null, source: null, error: "Missing song id", loadTimeMs: 0 };
  }

  const paths = [
    `/api/songs/${encodeURIComponent(sid)}`,
    `/api/songs?ids=${encodeURIComponent(sid)}`,
  ];

  const errors = [];
  let partial = null;

  for (const [label, base] of [
    ["primary", PRIMARY_BASE],
    ["fallback", FALLBACK_BASE],
  ]) {
    for (const p of paths) {
      try {
        const { data, loadTimeMs } = await fetchJson(`${base}${p}`);
        const raw =
          (Array.isArray(data?.data) && data.data[0]) ||
          (Array.isArray(data) && data[0]) ||
          data?.data ||
          data;

        const song = normalizeSong(raw);
        if (!song.id) continue;

        if (song.audioUrl) {
          return { song, source: label, error: null, loadTimeMs };
        }

        if (!partial) {
          partial = { song, source: label, error: null, loadTimeMs };
        }
      } catch (e) {
        const msg = e?.name === "AbortError" ? "timed out" : e?.message || String(e);
        errors.push(`${label} ${p}: ${msg}`);
      }
    }
  }

  if (partial) {
    return {
      ...partial,
      error: partial.song?.audioUrl ? null : "No stream URL in response",
    };
  }

  return {
    song: null,
    source: null,
    error: errors.length ? errors.join(" → ") : "Song not found",
    loadTimeMs: 0,
  };
}

export { PRIMARY_BASE, FALLBACK_BASE, DEFAULT_TIMEOUT_MS };
