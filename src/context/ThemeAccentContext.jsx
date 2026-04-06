import { createContext, useContext, useMemo } from "react";
import { resolveAccent } from "../utils/themeAccents";

const ThemeAccentContext = createContext(resolveAccent("purple"));

export function ThemeAccentProvider({ theme, children }) {
  const value = useMemo(() => resolveAccent(theme), [theme]);
  return <ThemeAccentContext.Provider value={value}>{children}</ThemeAccentContext.Provider>;
}

export function useThemeAccent() {
  return useContext(ThemeAccentContext);
}
