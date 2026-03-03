import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { parseGitHubUrl } from "@/lib/github";
import { runSecurityScan } from "@/lib/orchestrator";
import { computeGrade } from "@/lib/score";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

// POST /api/scan-from-github — URL GitHub → clone, scan, rapport JSON
export async function POST(request: NextRequest) {
  let tempDir: string | null = null;
  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json(
        { error: "Missing or invalid url" },
        { status: 400 }
      );
    }

    // Validation et parsing centralisés (lib/github) — construit l’URL de clone
    const { owner, repo } = parseGitHubUrl(url);
    const cloneUrl = `https://github.com/${owner}/${repo}`;

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "securescan-"));
    await execFileAsync("git", ["clone", "--depth", "1", cloneUrl, "."], {
      cwd: tempDir,
      timeout: 120000,
    });

    const result = await runSecurityScan(tempDir);
    const grade = computeGrade(result.score);
    return NextResponse.json({
      score: result.score,
      grade,
      totalFindings: result.totalFindings,
      vulnerabilities: result.vulnerabilities,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("URL") || message.includes("invalide") || message.includes("Format")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("Domaine") || message.includes("autorisé") || message.includes("Nom d'utilisateur") || message.includes("Nom de repo")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("clone") || message.includes("fatal")) {
      return NextResponse.json(
        { error: "Échec du clone. Vérifiez l'URL et que le repo est accessible." },
        { status: 400 }
      );
    }
    console.error("[scan-from-github]", err);
    return NextResponse.json(
      { error: "Scan failed", details: message },
      { status: 500 }
    );
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, maxRetries: 2 });
      } catch {
        // Nettoyage du répertoire temporaire (ignore si échec)
      }
    }
  }
}
