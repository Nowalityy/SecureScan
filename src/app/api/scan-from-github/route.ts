import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { parseGitHubUrl } from "@/lib/github";
import { runSecurityScan } from "@/lib/orchestrator";
import { computeGrade, computeScore } from "@/lib/score";
import type { Vulnerability } from "@/lib/types";

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
    console.log(`[scan-from-github] Clone de ${cloneUrl} dans ${tempDir}`);
    // Clone toutes les branches (shallow pour la vitesse)
    await execFileAsync("git", ["clone", "--no-single-branch", "--depth", "1", cloneUrl, "."], {
      cwd: tempDir,
      timeout: 180000,
    });
    console.log(`[scan-from-github] Clone OK`);

    // Lister toutes les branches distantes
    const { stdout: branchesRaw } = await execFileAsync("git", ["branch", "-r"], { cwd: tempDir });
    const branches = branchesRaw
      .split("\n")
      .map((b) => b.trim())
      .filter((b) => b && !b.includes("HEAD"))
      .map((b) => b.replace(/^origin\//, ""));

    console.log(`[scan-from-github] ${branches.length} branche(s) trouvée(s):`, branches);

    // Scanner chaque branche et agréger les résultats
    const allVulnerabilities: Vulnerability[] = [];
    for (const branch of branches) {
      try {
        console.log(`[scan-from-github] === Checkout branche: ${branch} ===`);
        await execFileAsync("git", ["checkout", branch], { cwd: tempDir, timeout: 30000 });
        console.log(`[scan-from-github] Checkout OK: ${branch}`);
        const branchResult = await runSecurityScan(tempDir, branch);
        console.log(`[scan-from-github] Branche "${branch}" — findings: ${branchResult.vulnerabilities.length}`);
        allVulnerabilities.push(...branchResult.vulnerabilities);
      } catch (branchErr) {
        console.error(`[scan-from-github] ERREUR sur branche "${branch}":`, branchErr);
      }
    }
    console.log(`[scan-from-github] Total avant dédup: ${allVulnerabilities.length} findings`);

    // Dédoublonnage : même tool + file + line + description = même faille
    // On fusionne les branches ("main, feature/x") pour garder la traçabilité
    const dedupMap = new Map<string, Vulnerability>();
    for (const v of allVulnerabilities) {
      const key = `${v.tool}|${v.file}|${v.line ?? ""}|${v.description}`;
      if (dedupMap.has(key)) {
        const existing = dedupMap.get(key)!;
        if (v.branch && existing.branch && !existing.branch.split(", ").includes(v.branch)) {
          existing.branch = `${existing.branch}, ${v.branch}`;
        }
      } else {
        dedupMap.set(key, { ...v });
      }
    }
    const uniqueVulnerabilities = Array.from(dedupMap.values());
    console.log(`[scan-from-github] Après dédup: ${uniqueVulnerabilities.length} findings uniques`);
    for (const v of uniqueVulnerabilities) {
      console.log(`  [finding] [${v.severity}] ${v.tool} | ${v.file}:${v.line ?? "?"} | branch: ${v.branch ?? "?"} | ${v.description.slice(0, 80)}`);
    }

    const score = computeScore(uniqueVulnerabilities);
    const grade = computeGrade(score);
    return NextResponse.json({
      score,
      grade,
      totalFindings: uniqueVulnerabilities.length,
      vulnerabilities: uniqueVulnerabilities,
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
