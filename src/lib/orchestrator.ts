import path from "path";
import fs from "fs";
import { runSemgrep } from "@/lib/scanners/semgrep";
import { runNpmAudit } from "@/lib/scanners/npmAudit";
import { runTruffleHog } from "@/lib/scanners/trufflehog";
import {
  parseSemgrepJson,
  parseNpmAuditJson,
  parseTruffleHogJson,
} from "@/lib/parser";
import {
  mapSemgrepToOwasp,
  mapNpmAuditToOwasp,
  mapTruffleHogToOwasp,
} from "@/lib/owaspMapper";
import { computeScore } from "@/lib/score";
import type { Vulnerability } from "@/lib/types";

export interface ScanResult {
  score: number;
  totalFindings: number;
  vulnerabilities: Vulnerability[];
}

// Lance Semgrep, npm audit et TruffleHog en parallèle, agrège les findings et calcule le score.
export async function runSecurityScan(repoPath: string): Promise<ScanResult> {
  const resolvedPath = path.resolve(repoPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error("repoPath does not exist");
  }
  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error("repoPath is not a directory");
  }

  const [semgrepSettled, npmSettled, truffleSettled] = await Promise.allSettled([
    runSemgrep(resolvedPath),
    runNpmAudit(resolvedPath),
    runTruffleHog(resolvedPath),
  ]);

  const vulnerabilities: Vulnerability[] = [];

  // Agrégation des résultats des 3 outils (stdout JSON → Vulnerability[])
  if (semgrepSettled.status === "fulfilled") {
    const list = parseSemgrepJson(semgrepSettled.value.stdout);
    for (const item of list) {
      vulnerabilities.push(mapSemgrepToOwasp(item));
    }
  }

  if (npmSettled.status === "fulfilled") {
    const list = parseNpmAuditJson(npmSettled.value.stdout);
    for (const item of list) {
      vulnerabilities.push(mapNpmAuditToOwasp(item));
    }
  }

  if (truffleSettled.status === "fulfilled") {
    const list = parseTruffleHogJson(truffleSettled.value.stdout);
    for (const item of list) {
      vulnerabilities.push(mapTruffleHogToOwasp(item));
    }
  }

  const score = computeScore(vulnerabilities);
  return {
    score,
    totalFindings: vulnerabilities.length,
    vulnerabilities,
  };
}
