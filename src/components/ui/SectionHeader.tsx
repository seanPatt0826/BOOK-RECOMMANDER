import type { ReactNode } from "react";

const BAR: Record<"accent" | "violet" | "rose", string> = {
  accent: "bg-accent",
  violet: "bg-violet",
  rose: "bg-rose",
};
const SIZE: Record<"lg" | "xl", string> = {
  lg: "text-lg",
  xl: "text-2xl",
};

export default function SectionHeader({
  children,
  accent = "accent",
  size = "xl",
  as: Tag = "h2",
  className = "",
}: {
  children: ReactNode;
  accent?: "accent" | "violet" | "rose";
  size?: "lg" | "xl";
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <span className={`h-5 w-1 rounded-full ${BAR[accent]}`} />
      <Tag className={`${SIZE[size]} font-semibold`}>{children}</Tag>
    </div>
  );
}
