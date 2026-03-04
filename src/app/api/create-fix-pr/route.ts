import { NextRequest, NextResponse } from "next/server";
import { createFixPr } from "@/lib/githubBot";
import { parseGitHubUrl } from "@/lib/github";
import type { AiFixResult } from "@/lib/gemini";

export const runtime = "nodejs";

// POST /api/create-fix-pr
// Body: { repoUrl, filePath, fix: { fixedCode, explanation }, vulnerabilityDescription }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, filePath, fix, vulnerabilityDescription, branch } = body as {
      repoUrl?: string;
      filePath?: string;
      fix?: AiFixResult;
      vulnerabilityDescription?: string;
      branch?: string;
    };

    if (!repoUrl || !filePath || !fix?.fixedCode || !fix?.explanation || !vulnerabilityDescription) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const { owner, repo } = parseGitHubUrl(repoUrl);
    const result = await createFixPr(owner, repo, filePath, fix, vulnerabilityDescription, branch);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[create-fix-pr]", err);
    if (message.includes("GITHUB_BOT_TOKEN")) {
      return NextResponse.json({ error: "Token GitHub bot non configuré" }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
