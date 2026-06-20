import type { ComponentProps } from "react";

const FIELD =
  "w-full rounded-lg border border-edge bg-paper px-3 py-2 text-ink placeholder:text-muted/70 focus:border-accent";

export default function Textarea({
  className = "",
  ...rest
}: ComponentProps<"textarea">) {
  return <textarea className={`${FIELD} ${className}`.trim()} {...rest} />;
}
