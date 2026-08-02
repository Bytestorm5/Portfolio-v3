"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { WeeklyPoint } from "@/lib/metrics";
import { formatWeek } from "@/lib/formatters";

const PAD = { top: 16, right: 20, bottom: 30, left: 56 };
const HEIGHT = 300;
/** Used for the server render; a ResizeObserver takes over after mount. */
const SSR_WIDTH = 880;

/**
 * Rounds a range up to ticks at 1/2/5×10ⁿ so the axis reads in clean numbers.
 * The top tick always lands at or above `max` — otherwise the series would be
 * drawn above the plot area and clipped.
 */
function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / target;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? mag * 10;
  const ticks: number[] = [];
  for (let t = 0; t < max + step; t += step) ticks.push(t);
  return ticks;
}

type Props = {
  data: WeeklyPoint[];
  /** Snapshot timestamp, surfaced in the caption above the plot. */
  generatedAt: string;
};

export default function CommitChart({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(SSR_WIDTH);
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(320, entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const geom = useMemo(() => {
    const maxCum = data[data.length - 1]?.cum ?? 0;
    const ticks = niceTicks(maxCum);
    const yMax = Math.max(ticks[ticks.length - 1], 1);

    const x = (i: number) =>
      PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

    const line = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.cum)}`).join("");
    const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;

    // Year boundaries make far better x-ticks than evenly spaced weeks.
    const yearTicks: { i: number; label: string }[] = [];
    let lastYear = "";
    data.forEach((p, i) => {
      const year = p.w.slice(0, 4);
      if (year !== lastYear) {
        yearTicks.push({ i, label: year });
        lastYear = year;
      }
    });

    return { x, y, line, area, ticks, yMax, yearTicks };
  }, [data, plotW, plotH]);

  const last = data[data.length - 1];
  const shown = active === null ? null : data[active];

  const pickNearest = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el || data.length < 2) return;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left - PAD.left) / plotW;
      const i = Math.round(ratio * (data.length - 1));
      setActive(Math.min(data.length - 1, Math.max(0, i)));
    },
    [data.length, plotW],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End")
        return;
      e.preventDefault();
      setActive((prev) => {
        const cur = prev ?? data.length - 1;
        if (e.key === "Home") return 0;
        if (e.key === "End") return data.length - 1;
        const next = cur + (e.key === "ArrowRight" ? 1 : -1);
        return Math.min(data.length - 1, Math.max(0, next));
      });
    },
    [data.length],
  );

  // Dash-array length for the draw-in animation; an overestimate is fine.
  const lineLength = plotW + plotH * 2;

  return (
    <figure className="m-0">
      <div
        ref={wrapRef}
        className="relative w-full"
        onPointerMove={(e) => pickNearest(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((p) => p ?? data.length - 1)}
          onBlur={() => setActive(null)}
          aria-label={
            `Cumulative commits over time. ${last?.cum.toLocaleString()} total commits ` +
            `as of ${formatWeek(last?.w ?? "")}. Use arrow keys to read individual weeks.`
          }
          className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Gridlines — hairline, solid, one step off the surface. */}
          {geom.ticks.map((t) => (
            <line
              key={t}
              x1={PAD.left}
              x2={width - PAD.right}
              y1={geom.y(t)}
              y2={geom.y(t)}
              stroke="var(--gridline)"
              strokeWidth="1"
              shapeRendering="crispEdges"
            />
          ))}

          {/* Y ticks. Text wears ink tokens, never the series color. */}
          {geom.ticks.map((t) => (
            <text
              key={t}
              x={PAD.left - 10}
              y={geom.y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-muted)"
              fontSize="11"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {t.toLocaleString()}
            </text>
          ))}

          {/* X ticks at year boundaries. */}
          {geom.yearTicks.map((t) => (
            <text
              key={t.label}
              x={geom.x(t.i)}
              y={HEIGHT - PAD.bottom + 18}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize="11"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {t.label}
            </text>
          ))}

          <path d={geom.area} fill={`url(#${gradientId})`} className="chart-area" />
          <path
            d={geom.line}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="chart-line"
            style={{ ["--line-length" as string]: lineLength }}
          />

          {/* Crosshair: readers aim at a date, not at a 2px line. */}
          {shown && (
            <g>
              <line
                x1={geom.x(active!)}
                x2={geom.x(active!)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="var(--axis)"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <circle
                cx={geom.x(active!)}
                cy={geom.y(shown.cum)}
                r="5"
                fill="var(--series-1)"
                stroke="var(--surface-1)"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Endpoint marker + the one direct label on the chart. */}
          {last && active === null && (
            <>
              <circle
                cx={geom.x(data.length - 1)}
                cy={geom.y(last.cum)}
                r="4.5"
                fill="var(--series-1)"
                stroke="var(--surface-1)"
                strokeWidth="2"
              />
              <text
                x={geom.x(data.length - 1) - 8}
                y={geom.y(last.cum) - 12}
                textAnchor="end"
                fill="var(--text-primary)"
                fontSize="12"
                fontWeight="600"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {last.cum.toLocaleString()}
              </text>
            </>
          )}
        </svg>

        {/* Tooltip. Value leads, label follows. */}
        {shown && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute top-2 z-10 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(geom.x(active!) - 70, 4), Math.max(width - 150, 4)),
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                aria-hidden
                className="inline-block h-[2px] w-3 rounded-full"
                style={{ background: "var(--series-1)" }}
              />
              <span
                className="text-sm font-semibold text-[var(--text-primary)]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {shown.cum.toLocaleString()}
              </span>
              <span className="text-[var(--text-secondary)]">total</span>
            </div>
            <div className="mt-1 text-[var(--text-secondary)]">
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{shown.c}</span> that week
            </div>
            <div className="mt-0.5 text-[var(--text-muted)]">{formatWeek(shown.w)}</div>
          </div>
        )}
      </div>

      <figcaption className="mt-3 text-xs text-[var(--text-muted)]">
        Hover, or focus the chart and use ← → to read individual weeks.
      </figcaption>
    </figure>
  );
}
