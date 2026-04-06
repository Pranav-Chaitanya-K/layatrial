import { useCallback, useEffect, useState } from "react";
import { loadAppSettings } from "../utils/appSettings";

function pickUi() {
  const p = loadAppSettings();
  return {
    songCardSize: p.songCardSize === "compact" || p.songCardSize === "cozy" ? p.songCardSize : "comfortable",
    showSongCardImages: p.showSongCardImages !== false,
  };
}

/** Live UI prefs from `utopian-app-settings` (card density + artwork visibility). */
export function useUiSettings() {
  const [ui, setUi] = useState(pickUi);

  const refresh = useCallback(() => setUi(pickUi()), []);

  useEffect(() => {
    window.addEventListener("utopian-settings-updated", refresh);
    return () => window.removeEventListener("utopian-settings-updated", refresh);
  }, [refresh]);

  return ui;
}

/** Map size preset → CSS min width for grids */
export function gridMinForCardSize(size) {
  if (size === "compact") return "200px";
  if (size === "cozy") return "240px";
  return "280px";
}
