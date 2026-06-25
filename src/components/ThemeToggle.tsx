"use client";

import { useSyncExternalStore } from "react";

// Subscribe to changes of the <html> class so the toggle reflects the live theme.
function subscribeToHtmlClass(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

// The DOM's `.dark` class is the source of truth. useSyncExternalStore renders
// the server snapshot (light) during SSR *and* the first hydration render, then
// switches to the live DOM value — so the server and client agree and there is
// no hydration mismatch. The no-flash script in layout.tsx sets the real class.
function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribeToHtmlClass,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

// Hydration flag: false on the server and the first client render, true after.
// Same server-snapshot trick keeps the icon's fade-in from causing a mismatch.
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function ThemeToggle() {
  const dark = useIsDark();
  const mounted = useHydrated();

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private mode / storage blocked — the toggle still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-edge bg-surface text-accent shadow-sm transition hover:border-accent hover:shadow-md"
    >
      {/* Avoid an icon mismatch before we've read the real theme. */}
      <span
        className={`transition-all duration-300 ${
          mounted ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      >
        {dark ? (
          // Sun
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          // Moon
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </span>
    </button>
  );
}
