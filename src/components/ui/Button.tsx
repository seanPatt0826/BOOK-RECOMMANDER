// src/components/ui/Button.tsx
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";
type ButtonShape = "pill" | "rounded" | "xl";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-contrast hover:bg-accent-strong",
  secondary:
    "border border-edge text-ink hover:border-accent hover:text-accent",
  ghost: "text-ink/80 hover:text-accent hover:bg-surface-2",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
  lg: "px-6 py-3 text-sm",
};

const SHAPE: Record<ButtonShape, string> = {
  pill: "rounded-full",
  rounded: "rounded-lg",
  xl: "rounded-xl",
};

const BASE =
  "inline-flex items-center justify-center font-semibold transition disabled:opacity-50";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<ComponentProps<typeof Link>, "className" | "children" | "href"> & {
    href: string;
  };

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  const {
    variant = "primary",
    size = "md",
    shape = "rounded",
    className = "",
    children,
    ...rest
  } = props;
  const cls = `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${SHAPE[shape]} ${className}`.trim();

  if ("href" in props && props.href !== undefined) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }
  const { type = "button", ...btnRest } = rest as ButtonAsButton;
  return (
    <button type={type} className={cls} {...btnRest}>
      {children}
    </button>
  );
}
