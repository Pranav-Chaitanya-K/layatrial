/**
 * App-wide settings: theme, UI density, artwork, **multiple language leanings**, spatial audio, player defaults.
 * Persists to `utopian-app-settings`; `saveAppSettings` dispatches `utopian-settings-updated`.
 */

export const APP_SETTINGS_KEY = "utopian-app-settings";

/** BCP-47-ish ids for discovery bias (Indian languages + English). */
export const LANGUAGE_OPTIONS = [
  { id: "en", label: "English (India)" },
  { id: "hi", label: "Hindi — हिन्दी" },
  { id: "ta", label: "Tamil — தமிழ்" },
  { id: "te", label: "Telugu — తెలుగు" },
  { id: "kn", label: "Kannada — ಕನ್ನಡ" },
  { id: "ml", label: "Malayalam — മലയാളം" },
  { id: "mr", label: "Marathi — मराठी" },
  { id: "bn", label: "Bengali — বাংলা" },
  { id: "gu", label: "Gujarati — ગુજરાતી" },
  { id: "pa", label: "Punjabi — ਪੰਜਾਬੀ" },
  { id: "or", label: "Odia — ଓଡ଼ିଆ" },
  { id: "as", label: "Assamese — অসমীয়া" },
  { id: "ur", label: "Urdu — اردو" },
  { id: "kok", label: "Konkani" },
  { id: "ne", label: "Nepali" },
  { id: "sa", label: "Sanskrit" },
];

/**
 * Discovery search phrases — **avoid** generic “trending” titles that pollute results.
 * Mix chart artists, recent-film language, and blockbuster OST cues; API still returns a wide net.
 */
const DISCOVERY_BY_LANG = {
  en: [
    "Arijit Singh best songs",
    "Bollywood movie songs 2024 2025",
    "Shreya Ghoshal hits hindi",
    "Pritam bollywood hits",
  ],
  hi: [
    "Diljit Dosanjh hindi punjabi hits",
    "Honey Singh popular songs",
    "Badshah rap bollywood",
    "Jubin Nautiyal romantic songs",
  ],
  ta: [
    "Anirudh Ravichander tamil hits",
    "Tamil movie songs 2024",
    "A.R. Rahman tamil classics",
    "Sid Sriram tamil melodies",
  ],
  te: [
    "Telugu movie blockbuster songs",
    "SS Rajamouli film songs telugu",
    "Devi Sri Prasad telugu hits",
  ],
  kn: [
    "Kannada film songs latest",
    "Rakshita Shetty kannada soundtrack",
  ],
  ml: [
    "Malayalam film songs latest",
    "Sushin Shyam malayalam hits",
  ],
  mr: [
    "Marathi film songs Ajay Atul",
    "Marathi lavani hit songs",
  ],
  bn: [
    "Arijit Singh bengali songs",
    "Anupam Roy bengali film hits",
  ],
  gu: [
    "Gujarati film songs latest",
    "Sachin-Jigar gujarati hits",
  ],
  pa: [
    "Sidhu Moose Wala hits",
    "Karan Aujla punjabi songs",
  ],
  or: [
    "Odia movie songs latest",
  ],
  as: [
    "Assamese film songs Zubeen Garg",
  ],
  ur: [
    "Bollywood urdu poetry songs Rahat Fateh Ali",
  ],
  kok: ["Konkani pop india"],
  ne: ["Nepali film songs latest"],
  sa: ["Indian classical fusion instrumental"],
};

/** Always blend these global cues so results are never locked to only selected languages. */
const GLOBAL_DISCOVERY = [
  "Bollywood soundtrack blockbuster",
  "RRR Naatu film songs",
  "Animal film songs Bollywood",
  "Latest hindi cinema album",
  "Chartbuster indian singles 2025",
];

const DEFAULTS = {
  theme: "purple",
  defaultVolume: 1,
  defaultShuffle: false,
  defaultRepeat: "off",
  /** Multiple language leanings for discovery; merged with global queries. */
  languagePreferences: ["en", "hi"],
  /** Legacy key — migrated into `languagePreferences` on load. */
  languagePreference: "en",
  spatialAudio: false,
  songCardSize: "comfortable",
  showSongCardImages: true,
};

function validLang(id) {
  return LANGUAGE_OPTIONS.some((l) => l.id === id);
}

function normalizeLanguagePrefs(parsed) {
  if (Array.isArray(parsed.languagePreferences) && parsed.languagePreferences.length) {
    const xs = [...new Set(parsed.languagePreferences.filter(validLang))];
    if (xs.length) return xs;
  }
  if (parsed.languagePreference && validLang(parsed.languagePreference)) {
    return [parsed.languagePreference];
  }
  return [...DEFAULTS.languagePreferences];
}

/**
 * Build a diversified list of API search strings for `getTrendingSongs`.
 * Selected languages are weighted (more phrases), while `GLOBAL_DISCOVERY` keeps the mix broad.
 */
export function buildTrendingDiscoveryQueries(languageIds) {
  const ids = Array.isArray(languageIds) && languageIds.length ? languageIds : DEFAULTS.languagePreferences;
  const uniq = [...new Set(ids.filter(validLang))];
  const out = [];

  for (const g of GLOBAL_DISCOVERY) out.push(g);

  for (const id of uniq) {
    const block = DISCOVERY_BY_LANG[id] || DISCOVERY_BY_LANG.en;
    out.push(...block);
  }

  // De-dupe while preserving order; cap concurrent fetches in `api.js`
  const seen = new Set();
  const deduped = [];
  for (const q of out) {
    const k = q.toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    deduped.push(q);
  }
  return deduped.slice(0, 12);
}

/** @deprecated single-query helper — use `buildTrendingDiscoveryQueries` + `getTrendingSongs` */
export function buildTrendingSearchQuery(languagePreference) {
  const q = buildTrendingDiscoveryQueries([languagePreference || "en"]);
  return q[0] || GLOBAL_DISCOVERY[0];
}

export function loadAppSettings() {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS, languagePreferences: [...DEFAULTS.languagePreferences] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULTS, languagePreferences: [...DEFAULTS.languagePreferences] };
    const languagePreferences = normalizeLanguagePrefs(parsed);
    return {
      ...DEFAULTS,
      ...parsed,
      languagePreferences,
      languagePreference: languagePreferences[0] || DEFAULTS.languagePreference,
      defaultRepeat: ["off", "all", "one"].includes(parsed.defaultRepeat)
        ? parsed.defaultRepeat
        : DEFAULTS.defaultRepeat,
      spatialAudio: Boolean(parsed.spatialAudio),
      songCardSize: ["comfortable", "cozy", "compact"].includes(parsed.songCardSize)
        ? parsed.songCardSize
        : DEFAULTS.songCardSize,
      showSongCardImages: parsed.showSongCardImages !== false,
    };
  } catch {
    return { ...DEFAULTS, languagePreferences: [...DEFAULTS.languagePreferences] };
  }
}

export function saveAppSettings(next) {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("utopian-settings-updated"));
  } catch {
    // quota / private mode
  }
}

export function mergeAppSettings(partial) {
  const cur = loadAppSettings();
  const merged = {
    ...cur,
    ...partial,
    languagePreferences: partial.languagePreferences
      ? [...new Set(partial.languagePreferences.filter(validLang))]
      : cur.languagePreferences,
  };
  if (merged.languagePreferences?.length) {
    merged.languagePreference = merged.languagePreferences[0];
  }
  saveAppSettings(merged);
  return merged;
}
