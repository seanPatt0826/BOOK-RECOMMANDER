import { starFill, type StarState } from "./starFill";

const SIZE = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
} as const;

// A single star. `state` controls the amber fill: full, half (left-clipped), or
// empty. Empty stars use the edge token; filled use accent.
function Star({ state, sizeClass }: { state: StarState; sizeClass: string }) {
  const path =
    "M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.9l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.94z";
  return (
    <span className={`relative inline-block ${sizeClass}`} aria-hidden="true">
      {/* Empty base */}
      <svg viewBox="0 0 24 24" className={`${sizeClass} text-edge`} fill="currentColor">
        <path d={path} />
      </svg>
      {/* Amber overlay, clipped to 50% for a half star */}
      {state !== "empty" && (
        <span
          className="absolute inset-0 overflow-hidden"
          style={state === "half" ? { width: "50%" } : undefined}
        >
          <svg viewBox="0 0 24 24" className={`${sizeClass} text-accent`} fill="currentColor">
            <path d={path} />
          </svg>
        </span>
      )}
    </span>
  );
}

export default function StarRating({
  rating,
  outOf = 5,
  size = "sm",
  showValue = false,
  className = "",
}: {
  rating: number;
  outOf?: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
}) {
  const stars = starFill(rating, outOf);
  const sizeClass = SIZE[size];
  const rounded = Math.round(Math.max(0, Math.min(outOf, rating)) * 10) / 10;
  return (
    <span
      role="img"
      aria-label={`Rated ${rounded} out of ${outOf}`}
      className={`inline-flex items-center gap-0.5 ${className}`.trim()}
    >
      {stars.map((state, i) => (
        <Star key={i} state={state} sizeClass={sizeClass} />
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-muted">{rounded}</span>
      )}
    </span>
  );
}
