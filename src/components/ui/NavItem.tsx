export default function NavItem({
  selected,
  onClick,
  label,
  count,
  truncate = false,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count?: number | string;
  truncate?: boolean;
}) {
  const cls = `flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
    selected
      ? "bg-accent text-accent-contrast shadow-[var(--shadow-sm)]"
      : "text-ink/75 hover:bg-surface-2 hover:text-accent"
  }`;
  return (
    <button type="button" onClick={onClick} className={cls}>
      <span className={truncate ? "truncate" : undefined}>{label}</span>
      {count !== undefined && (
        <span className="text-xs opacity-70">{count}</span>
      )}
    </button>
  );
}
