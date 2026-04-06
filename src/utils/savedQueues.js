/**
 * Named “saved queues” — quick snapshots separate from Library playlists.
 * Stored under `utopian-music-saved-queues` as a JSON array.
 */

const STORAGE_KEY = "utopian-music-saved-queues";

export function loadSavedQueues() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedQueues(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // quota / private mode
  }
}

export function createSavedQueueRecord(name, songs = []) {
  const now = new Date().toISOString();
  return {
    id: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    name: (name && String(name).trim()) || "Untitled queue",
    songs: Array.isArray(songs) ? songs : [],
    updatedAt: now,
  };
}

export function addSavedQueue(queues, record) {
  const next = [...queues, record];
  saveSavedQueues(next);
  return next;
}

export function removeSavedQueue(queues, id) {
  const next = queues.filter((q) => q.id !== id);
  saveSavedQueues(next);
  return next;
}
