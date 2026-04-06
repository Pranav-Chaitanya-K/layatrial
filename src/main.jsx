/**
 * Vite + React entry point for Utopian Music Player.
 *
 * - `createRoot` mounts the tree under `#root` from `index.html`.
 * - Global styles (Tailwind layers + custom rules) load from `./index.css` before any components paint.
 * - `PlayerProvider` already wraps the app inside `App.jsx`, together with `BrowserRouter`.
 *   We only add `React.StrictMode` here so development checks run without duplicating providers.
 *
 * Flow: index.html → main.jsx → App.jsx → routes + PlayerProvider + layout
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const el = document.getElementById("root");

if (!el) {
  throw new Error('Missing #root element — add <div id="root"></div> in index.html.');
}

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>
);
