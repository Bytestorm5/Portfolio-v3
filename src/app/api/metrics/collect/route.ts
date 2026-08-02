import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { collectMetrics } from "@/lib/collector";
import { readSnapshot, writeSnapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Collecting walks every repo; well above the default serverless budget. */
export const maxDuration = 300;

const DEFAULT_MIN_INTERVAL_HOURS = 20;

/**
 * A collection already running. Concurrent callers await the same promise
 * instead of each starting their own walk of the GitHub API.
 */
let inFlight: Promise<Awaited<ReturnType<typeof collectMetrics>>> | null = null;

function secret(): string | undefined {
  // CRON_SECRET is what Vercel Cron sends by default.
  return process.env.METRICS_CRON_SECRET ?? process.env.CRON_SECRET;
}

function authorized(request: Request): boolean {
  const expected = secret();
  // With no secret configured, only allow this outside production — otherwise
  // a public deployment would expose an unauthenticated GitHub API amplifier.
  if (!expected) return process.env.NODE_ENV !== "production";

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function minIntervalMs(): number {
  const hours = Number(process.env.METRICS_MIN_INTERVAL_HOURS);
  return (Number.isFinite(hours) && hours >= 0 ? hours : DEFAULT_MIN_INTERVAL_HOURS) * 3_600_000;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force") === "1";
  const existing = await readSnapshot();

  // Idempotency guard: an extra request inside the window is a no-op that
  // reports the current state, so a stray or retried call cannot pull the
  // collection cadence forward or double-write the snapshot.
  if (existing && !force) {
    const age = Date.now() - new Date(existing.generatedAt).getTime();
    const window = minIntervalMs();
    if (age < window) {
      return NextResponse.json(
        {
          status: "skipped",
          reason: "within minimum collection interval",
          generatedAt: existing.generatedAt,
          ageSeconds: Math.floor(age / 1000),
          nextEligibleAt: new Date(
            new Date(existing.generatedAt).getTime() + window,
          ).toISOString(),
        },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const started = !inFlight;
  inFlight ??= collectMetrics()
    .then(async (metrics) => {
      await writeSnapshot(metrics);
      return metrics;
    })
    .finally(() => {
      inFlight = null;
    });

  try {
    const metrics = await inFlight;
    return NextResponse.json(
      {
        status: started ? "collected" : "joined-in-flight",
        generatedAt: metrics.generatedAt,
        totals: metrics.totals,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        // The previous snapshot is untouched, so the site keeps serving it.
        servingSnapshotFrom: existing?.generatedAt ?? null,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/** GET is supported because most cron runners (including Vercel Cron) only GET. */
export const GET = handle;
export const POST = handle;
