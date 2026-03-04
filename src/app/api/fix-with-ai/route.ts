import { NextRequest, NextResponse } from "next/server";
import { fixVulnerabilityWithAI } from "@/lib/gemini";
import type { Vulnerability } from "@/lib/types";
import { parseGitHubUrl } from "@/lib/github";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

// POST /api/fix-with-ai
// Body: { repoUrl: string, filePath: string, vulnerabilities: Vulnerability[] }
export async function POST(request: NextRequest) {
  let tempDir: string | null = null;
  try {
    const body = await request.json();
    const { repoUrl, filePath, vulnerabilities, branch } = body as {
      repoUrl?: string;
      filePath?: string;
      vulnerabilities?: Vulnerability[];
      branch?: string;
    };

    if (!repoUrl || !filePath || !Array.isArray(vulnerabilities) || vulnerabilities.length === 0) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Sécurité : filePath ne doit pas sortir du repo (pas de ../)
    const normalized = path.normalize(filePath).replace(/\\/g, "/");
    if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
      return NextResponse.json({ error: "Chemin de fichier invalide" }, { status: 400 });
    }

    const { owner, repo } = parseGitHubUrl(repoUrl);
    const cloneUrl = `https://github.com/${owner}/${repo}`;

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "securescan-fix-"));
    await execFileAsync("git", ["clone", "--no-single-branch", "--depth", "1", cloneUrl, "."], {
      cwd: tempDir,
      timeout: 120000,
    });

    // Checkout la branche d'origine de la vulnérabilité si précisée
    if (branch) {
      try {
        await execFileAsync("git", ["checkout", branch], { cwd: tempDir, timeout: 15000 });
      } catch {
        // branche introuvable, on reste sur la branche par défaut
        console.warn(`[fix-with-ai] Branche "${branch}" introuvable, branche par défaut utilisée`);
      }
    }

    const fullPath = path.join(tempDir, normalized);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: `Fichier introuvable : ${filePath}` }, { status: 404 });
    }

    const fileContent = fs.readFileSync(fullPath, "utf-8");
    if (fileContent.length > 50000) {
      return NextResponse.json({ error: "Fichier trop volumineux pour l'IA (>50KB)" }, { status: 400 });
    }

    const result = await fixVulnerabilityWithAI(fileContent, filePath, vulnerabilities);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[fix-with-ai]", err);
    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json({ error: "Clé API Gemini non configurée" }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tempDir && fs.existsSync(tempDir)) {
      try { fs.rmSync(tempDir, { recursive: true, maxRetries: 2 }); } catch { /* ignore */ }
    }
  }
}
