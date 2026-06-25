import type { ReactNode } from "react";

export default function Chip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`chip ${className}`.trim()}>{children}</span>;
}
