import type { ReactNode } from "react";
import type { Tint } from "@/data/experience";

/* v2 tinted each card by the organization behind it; that carries over. */
const TINT_VAR: Record<Tint, string> = {
  att: "var(--tint-att)",
  njit: "var(--tint-njit)",
  cdx: "var(--tint-cdx)",
  personal: "var(--tint-personal)",
};

type Props = {
  tint?: Tint;
  /** Stagger index for the fly-in cascade. */
  delayIndex?: number;
  className?: string;
  children: ReactNode;
};

export default function Card({ tint, delayIndex = 0, className = "", children }: Props) {
  const rgb = tint ? TINT_VAR[tint] : null;

  return (
    <div
      className={`fly-in rounded-2xl border border-[var(--border)] p-5 ${className}`}
      style={{
        background: rgb
          ? `linear-gradient(308deg, rgba(255,255,255,0.03) 0%, rgba(${rgb}, 0.16) 100%)`
          : "rgba(255,255,255,0.04)",
        ["--fly-in-delay" as string]: `${80 + delayIndex * 110}ms`,
      }}
    >
      {children}
    </div>
  );
}
