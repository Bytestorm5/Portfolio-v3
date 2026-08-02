type Props = {
  label: string;
  value: string;
  detail?: string;
};

/**
 * Label in sentence case, value in the brand mono at display size using
 * proportional figures — tabular-nums is reserved for aligned columns.
 */
export default function StatTile({ label, value, detail }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white/[0.03] px-4 py-3">
      <div className="text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-xs text-[var(--text-secondary)]">{label}</div>
      {detail && <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{detail}</div>}
    </div>
  );
}
