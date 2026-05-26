import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { loadProblemIntelDashboard } from "@/lib/problem-intel";

export async function GET() {
  noStore();
  const { report, source, problems } = loadProblemIntelDashboard();

  return NextResponse.json({
    report,
    source,
    problems,
  });
}
