import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/metrics";

/**
 * Serves the collected snapshot so the numbers on the page are independently
 * checkable, and so anything else can consume the same feed.
 */
export async function GET() {
  const metrics = await getMetrics();

  if (!metrics) {
    return NextResponse.json(
      { error: "No snapshot yet. Hit /api/metrics/collect to build one." },
      { status: 503 },
    );
  }

  return NextResponse.json(metrics, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
