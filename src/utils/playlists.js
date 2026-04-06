/**
 * Saved playlists / queues in `localStorage` under `utopian-music-playlists`.
 *
 * Each record: `{ id, name, songs[], lastPlayed: ISO | null, updatedAt: ISO }`
 * Songs must be JSON-serializable (plain objects from the player / API).
 */

export const STORAGE_KEY = "utopian-music-playlists";

export function loadPlaylists() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePlaylists(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Quota or private browsing — caller may show a toast
  }
}

export function createPlaylistRecord(name, songs = []) {
  const now = new Date().toISOString();
  return {
    id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    name: (name && String(name).trim()) || "Untitled playlist",
    songs: Array.isArray(songs) ? songs : [],
    lastPlayed: null,
    updatedAt: now,
  };
}

export function addPlaylist(playlists, record) {
  const next = [...playlists, record];
  savePlaylists(next);
  return next;
}

export function replacePlaylist(playlists, id, updater) {
  const next = playlists.map((p) => (p.id === id ? updater(p) : p));
  savePlaylists(next);
  return next;
}

export function removePlaylist(playlists, id) {
  const next = playlists.filter((p) => p.id !== id);
  savePlaylists(next);
  return next;
}

/** Call when user loads a playlist into the player — updates `lastPlayed`. */
export function markPlaylistPlayed(playlists, playlistId) {
  const ts = new Date().toISOString();
  const next = playlists.map((p) =>
    p.id === playlistId ? { ...p, lastPlayed: ts, updatedAt: ts } : p
  );
  savePlaylists(next);
  return next;
}
