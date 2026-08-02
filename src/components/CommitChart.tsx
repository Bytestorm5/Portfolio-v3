"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { WeeklyPoint } from "@/lib/collector";
import { formatWeek } from "@/lib/formatters";

const PAD = { top: 14, right: 14, bottom: 26, left: 44 };
/** Used for the server render; a ResizeObserver takes over after mount. */
const SSR_WIDTH = 560;

/**
 * Rounds a range up to ticks at 1/2/5×10ⁿ so the axis reads in clean numbers.
 * The top tick always lands at or above `max` — otherwise the series would be
 * drawn above the plot area and clipped.
 */
function niceTicks(max: number, target = 3): number[] {
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
  height?: number;
};

export default function CommitChart({ data, height = 230 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(SSR_WIDTH);
  const [active, setActive] = useState<number | null>(null);
  const uid = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const last = data[data.length - 1];
  /* With no private commits in the snapshot, the split is noise — drop the
     second series and its legend row rather than plotting a flat zero. */
  const hasPrivate = (last?.cumPriv ?? 0) > 0;

  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const geom = useMemo(() => {
    const maxCum = last?.cum ?? 0;
    const ticks = niceTicks(maxCum);
    const yMax = Math.max(ticks[ticks.length - 1], 1);

    const x = (i: number) =>
      PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

    const lineFor = (pick: (p: WeeklyPoint) => number) =>
      data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(pick(p))}`).join("");

    /* Band between two series values, drawn as a closed ribbon. */
    const bandFor = (
      upper: (p: WeeklyPoint) => number,
      lower: (p: WeeklyPoint) => number,
    ) => {
      const up = data.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(upper(p))}`).join("");
      const down = data
        .map((p, i) => `L${x(data.length - 1 - i)},${y(lower(data[data.length - 1 - i]))}`)
        .join("");
      return `${up}${down}Z`;
    };

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

    return {
      x,
      y,
      ticks,
      yearTicks,
      publicLine: lineFor((p) => p.cumPub),
      totalLine: lineFor((p) => p.cum),
      publicBand: bandFor((p) => p.cumPub, () => 0),
      privateBand: bandFor((p) => p.cum, (p) => p.cumPub),
    };
  }, [data, plotW, plotH, last]);

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
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      setActive((prev) => {
        const cur = prev ?? data.length - 1;
        if (e.key === "Home") return 0;
        if (e.key === "End") return data.length - 1;
        return Math.min(
          data.length - 1,
          Math.max(0, cur + (e.key === "ArrowRight" ? 1 : -1)),
        );
      });
    },
    [data.length],
  );

  const lineLength = plotW + plotH * 2;
  const readout = shown ?? last;

  return (
    <figure className="m-0">
      {/* Legend carries identity for two series, and doubles as the direct
          label — end-labels on the plot would collide in this width. */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        <LegendItem
          color="var(--series-1)"
          label="Public"
          value={(readout?.cumPub ?? 0).toLocaleString()}
        />
        {hasPrivate && (
          <LegendItem
            color="var(--series-2)"
            label="Private"
            value={(readout?.cumPriv ?? 0).toLocaleString()}
          />
        )}
        <span className="ml-auto text-[var(--text-muted)]">
          {shown ? formatWeek(shown.w) : "Total to date"}
        </span>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full"
        onPointerMove={(e) => pickNearest(e.clientX)}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((p) => p ?? data.length - 1)}
          onBlur={() => setActive(null)}
          aria-label={
            `Cumulative commits over time, split by repository visibility. ` +
            `${last?.cum.toLocaleString()} total — ${last?.cumPub.toLocaleString()} to public repos` +
            (hasPrivate ? `, ${last?.cumPriv.toLocaleString()} to private repos` : "") +
            `. Use arrow keys to read individual weeks.`
          }
          className="block touch-pan-y outline-none"
        >
          <defs>
            <linearGradient id={`${uid}-pub`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id={`${uid}-priv`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-2)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--series-2)" stopOpacity="0.06" />
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

          {/* Axis text wears ink tokens, never a series color. */}
          {geom.ticks.map((t) => (
            <text
              key={t}
              x={PAD.left - 8}
              y={geom.y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="var(--text-muted)"
              fontSize="10"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {t.toLocaleString()}
            </text>
          ))}

          {geom.yearTicks.map((t) => (
            <text
              key={t.label}
              x={geom.x(t.i)}
              y={height - PAD.bottom + 16}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize="10"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {t.label}
            </text>
          ))}

          {hasPrivate && (
            <path d={geom.privateBand} fill={`url(#${uid}-priv)`} className="chart-area" />
          )}
          <path d={geom.publicBand} fill={`url(#${uid}-pub)`} className="chart-area" />

          {hasPrivate && (
            <path
              d={geom.totalLine}
              fill="none"
              stroke="var(--series-2)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="chart-line"
              style={{ ["--line-length" as string]: lineLength }}
            />
          )}
          <path
            d={geom.publicLine}
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
                y2={height - PAD.bottom}
                stroke="var(--axis)"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              {hasPrivate && (
                <circle
                  cx={geom.x(active!)}
                  cy={geom.y(shown.cum)}
                  r="4"
                  fill="var(--series-2)"
                  stroke="var(--surface-1)"
                  strokeWidth="2"
                />
              )}
              <circle
                cx={geom.x(active!)}
                cy={geom.y(shown.cumPub)}
                r="4"
                fill="var(--series-1)"
                stroke="var(--surface-1)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Tooltip. Value leads, label follows. */}
        {shown && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-[11px] shadow-lg"
            style={{
              left: Math.min(Math.max(geom.x(active!) - 60, 2), Math.max(width - 130, 2)),
            }}
          >
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-sm font-semibold text-[var(--text-primary)]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {shown.cum.toLocaleString()}
              </span>
              <span className="text-[var(--text-secondary)]">total</span>
            </div>
            <TooltipRow color="var(--series-1)" label="public" value={shown.cumPub} />
            {hasPrivate && (
              <TooltipRow color="var(--series-2)" label="private" value={shown.cumPriv} />
            )}
            <div className="mt-1 text-[var(--text-muted)]">
              +{shown.c} that week
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span
        aria-hidden
        className="inline-block h-[2px] w-3 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span className="text-[var(--text-muted)]">{label}</span>
      <span
        className="font-semibold text-[var(--text-primary)]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </span>
  );
}

function TooltipRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="mt-0.5 flex items-center gap-1.5 text-[var(--text-secondary)]">
      <span
        aria-hidden
        className="inline-block h-[2px] w-2.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString()}</span>
      <span className="text-[var(--text-muted)]">{label}</span>
    </div>
  );
}
