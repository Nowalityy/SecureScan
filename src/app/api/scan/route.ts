import { NextRequest, NextResponse } from "next/server";
import { runSecurityScan } from "@/lib/orchestrator";
import { computeGrade } from "@/lib/score";
import path from "path";

export const runtime = "nodejs";

// POST /api/scan — chemin local du repo → scan, rapport JSON (usage interne / tests)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const repoPath = typeof body?.repoPath === "string" ? body.repoPath.trim() : "";

    if (!repoPath || repoPath === "/" || repoPath.includes("..")) {
      return NextResponse.json(
        { error: "Missing or invalid repoPath" },
        { status: 400 }
      );
    }

    const resolvedPath = path.resolve(repoPath);
    const result = await runSecurityScan(resolvedPath);

    return NextResponse.json({
      score: result.score,
      grade: computeGrade(result.score),
      totalFindings: result.totalFindings,
      vulnerabilities: result.vulnerabilities,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "repoPath does not exist" || message === "repoPath is not a directory") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Scan failed", details: message },
      { status: 500 }
    );
  }
}
