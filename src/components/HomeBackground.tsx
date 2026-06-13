"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Mode = "calm" | "nature" | "gradient";

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

export default function HomeBackground() {
  const [mode, setMode] = useState<Mode>("calm");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("shelf-bg") as Mode | null;
      if (saved === "calm" || saved === "nature" || saved === "gradient") {
        setMode(saved);
      }
    } catch {
      // Storage blocked — just use the calm default.
    }
  }, []);

  function choose(next: Mode) {
    setMode(next);
    try {
      localStorage.setItem("shelf-bg", next);
    } catch {
      // Non-fatal.
    }
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

      {/* The picker. */}
      <label className="flex items-center gap-2 rounded-full border border-edge bg-surface/70 px-3 py-1.5 text-sm backdrop-blur">
        <span className="text-muted">Background</span>
        <select
          value={mode}
          onChange={(e) => choose(e.target.value as Mode)}
          className="cursor-pointer bg-transparent font-medium text-ink focus:outline-none"
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
