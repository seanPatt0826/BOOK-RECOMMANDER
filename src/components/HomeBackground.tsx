"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type Mode = "calm" | "nature" | "gradient";

const STORAGE_KEY = "shelf-bg";
const MODE_CHANGE_EVENT = "shelf-bg-change";

// Drifting leaves: scattered columns, sizes, speeds and green tints.
const LEAVES = [
  { left: "6%", size: 26, delay: "0s", duration: "15s", color: "#6f9450" },
  { left: "18%", size: 18, delay: "5s", duration: "19s", color: "#86a85f" },
  { left: "31%", size: 32, delay: "2s", duration: "17s", color: "#5d8742" },
  { left: "44%", size: 20, delay: "8s", duration: "21s", color: "#7fa356" },
  { left: "57%", size: 28, delay: "1s", duration: "16s", color: "#6f9450" },
  { left: "69%", size: 16, delay: "6s", duration: "22s", color: "#9bbd72" },
  { left: "81%", size: 30, delay: "3s", duration: "18s", color: "#5d8742" },
  { left: "92%", size: 22, delay: "9s", duration: "20s", color: "#86a85f" },
];

// A simple leaf with a midrib.
function Leaf({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16z" />
      <path
        d="M7 17C11 13 15 9 18 7"
        fill="none"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

// A row of swaying grass blades along the bottom edge.
const BLADES = Array.from({ length: 22 }, (_, i) => ({
  height: 38 + ((i * 7) % 34),
  delay: `${(i % 6) * 0.3}s`,
  duration: `${3.4 + (i % 5) * 0.4}s`,
}));

function Grass() {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-around px-2">
      {BLADES.map((b, i) => (
        <svg
          key={i}
          className="bg-grass-blade"
          width="10"
          height={b.height}
          viewBox="0 0 10 40"
          preserveAspectRatio="none"
          fill="#5d8742"
          aria-hidden="true"
          style={{ animationDelay: b.delay, animationDuration: b.duration }}
        >
          <path d="M5 40 C3 26 3 12 5 0 C7 12 7 26 5 40 Z" />
        </svg>
      ))}
    </div>
  );
}

// Read the saved scene from storage (blocked storage → "calm"). Client-only:
// useSyncExternalStore calls this for the client snapshot, never on the server.
function readSavedMode(): Mode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "calm" || saved === "nature" || saved === "gradient") {
      return saved;
    }
  } catch {
    // Storage blocked — fall through to the calm default.
  }
  return "calm";
}

function subscribeMode(onChange: () => void): () => void {
  window.addEventListener(MODE_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(MODE_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// localStorage is the source of truth for the scene. The server snapshot is
// always "calm", so the server render and the client's first (hydration) render
// agree; the saved value is read only on the client, after hydration.
function useBackgroundMode(): Mode {
  return useSyncExternalStore(subscribeMode, readSavedMode, () => "calm");
}

// false on the server and the first client render, true after — so the portal
// is client-only and does not run during SSR (renderToString can't do portals).
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function HomeBackground() {
  const mode = useBackgroundMode();
  const mounted = useHydrated();

  function choose(next: Mode) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal.
    }
    // Notify useSyncExternalStore subscribers so the scene re-reads immediately.
    window.dispatchEvent(new Event(MODE_CHANGE_EVENT));
  }

  {/* Full-screen scene behind the page. All three are mounted and cross-fade
      via opacity for a smooth in/out when switching. Rendered through a portal
      to <body> so its `fixed` positioning resolves to the viewport — inside the
      hero it would be trapped by the reveal animation's transform. */}
  const scene = (
    <div
      aria-hidden="true"
      className="pointer-events-none overflow-hidden"
      // Inline styles so the global `body > * { position: relative; z-index: 1 }`
      // rule (unlayered, beats Tailwind utilities) can't override the fixed,
      // behind-everything positioning this needs as a portaled <body> child.
      style={{ position: "fixed", inset: 0, zIndex: -10 }}
    >
      {/* Nature: drifting leaves + swaying grass. */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          mode === "nature" ? "opacity-100" : "opacity-0"
        }`}
      >
        {LEAVES.map((l, i) => (
          <span
            key={i}
            className="bg-leaf"
            style={{
              left: l.left,
              color: l.color,
              animationDelay: l.delay,
              animationDuration: l.duration,
            }}
          >
            <Leaf size={l.size} />
          </span>
        ))}
        <div className="opacity-40 dark:opacity-30">
          <Grass />
        </div>
      </div>

      {/* Gradient: slowly shifting warm colour wash. */}
      <div
        className={`bg-gradient-scene absolute inset-0 transition-opacity duration-700 ${
          mode === "gradient" ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Calm: nothing extra — the page's own warm glow shows through. */}
    </div>
  );

  return (
    <>
      {mounted && createPortal(scene, document.body)}

      {/* Subtle scene picker — low-emphasis until hovered. */}
      <label className="flex items-center gap-1.5 rounded-full border border-edge/50 bg-surface/40 px-2.5 py-1 text-xs text-muted backdrop-blur transition hover:border-edge hover:bg-surface/70">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 6.1 18.2 8 12.4 3 8.8h6.1z" />
        </svg>
        <span className="sr-only">Background scene</span>
        <select
          value={mode}
          onChange={(e) => choose(e.target.value as Mode)}
          className="cursor-pointer bg-transparent font-medium text-ink/80 focus:outline-none"
          aria-label="Choose background style"
        >
          <option value="calm">Calm</option>
          <option value="nature">Nature</option>
          <option value="gradient">Gradient</option>
        </select>
      </label>
    </>
  );
}
