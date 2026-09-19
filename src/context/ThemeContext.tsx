import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { ThemeMode } from "../types";
import { chatStorage } from "../services/storage";

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const THEME_STORAGE_KEY = "meyra_theme";

/**
 * Reads initial theme from localStorage, storage service, or falls back to 'dark'.
 */
function getInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }
    const settings = chatStorage.getSettings();
    if (settings?.theme) {
      return settings.theme;
    }
  } catch (e) {
    // ignore
  }
  return "dark";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Track system preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateSystemPreference = () => {
      setSystemIsDark(mediaQuery.matches);
    };

    updateSystemPreference();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateSystemPreference);
      return () => mediaQuery.removeEventListener("change", updateSystemPreference);
    } else if ((mediaQuery as any).addListener) {
      (mediaQuery as any).addListener(updateSystemPreference);
      return () => (mediaQuery as any).removeListener(updateSystemPreference);
    }
  }, []);

  // Compute resolvedTheme
  const resolvedTheme: "dark" | "light" = useMemo(() => {
    if (theme === "system") {
      return systemIsDark ? "dark" : "light";
    }
    return theme === "light" ? "light" : "dark";
  }, [theme, systemIsDark]);

  // Synchronize DOM elements (html, body, data-theme, color-scheme)
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (resolvedTheme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
      if (body) {
        body.classList.remove("dark");
        body.classList.add("light");
      }
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      if (body) {
        body.classList.remove("light");
        body.classList.add("dark");
      }
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    }
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      // Synchronize with chatStorage settings
      const currentSettings = chatStorage.getSettings();
      if (currentSettings.theme !== newTheme) {
        chatStorage.saveSettings({ ...currentSettings, theme: newTheme });
      }
    } catch (err) {
      console.error("Failed to persist theme:", err);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextMode: ThemeMode = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextMode);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
