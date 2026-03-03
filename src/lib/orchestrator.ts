import path from "path";
import fs from "fs";
import { runNpmAudit } from "@/lib/scanners/npmAudit";
import { runSecretsScanner } from "@/lib/scanners/secretsScanner";
import { runCodeScanner } from "@/lib/scanners/codeScanner";
import { parseNpmAuditJson } from "@/lib/parser";
import { mapNpmAuditToOwasp } from "@/lib/owaspMapper";
import { computeScore } from "@/lib/score";
import type { Vulnerability } from "@/lib/types";

export interface ScanResult {
  score: number;
  totalFindings: number;
  vulnerabilities: Vulnerability[];
}

// Lance les 3 scanners JS natifs + npm audit en parallèle, agrège les findings.
export async function runSecurityScan(repoPath: string, branch?: string): Promise<ScanResult> {
  const resolvedPath = path.resolve(repoPath);
  if (!fs.existsSync(resolvedPath)) throw new Error("repoPath does not exist");
  if (!fs.statSync(resolvedPath).isDirectory()) throw new Error("repoPath is not a directory");

  const tag = branch ?? "default";
  console.log(`[orchestrator][${tag}] Démarrage scan dans ${resolvedPath}`);

  // Les scanners JS sont synchrones — on les wrap en Promise pour paralléliser avec npm audit
  const [secretsSettled, codeSettled, npmSettled] = await Promise.allSettled([
    Promise.resolve(runSecretsScanner(resolvedPath)),
    Promise.resolve(runCodeScanner(resolvedPath)),
    runNpmAudit(resolvedPath),
  ]);

  const vulnerabilities: Vulnerability[] = [];

  if (secretsSettled.status === "fulfilled") {
    console.log(`[orchestrator][${tag}] secrets-scanner findings: ${secretsSettled.value.length}`);
    for (const v of secretsSettled.value) {
      vulnerabilities.push({ ...v, branch });
    }
  } else {
    console.error(`[orchestrator][${tag}] secrets-scanner rejeté:`, secretsSettled.reason);
  }

  if (codeSettled.status === "fulfilled") {
    console.log(`[orchestrator][${tag}] code-scanner findings: ${codeSettled.value.length}`);
    for (const v of codeSettled.value) {
      vulnerabilities.push({ ...v, branch });
    }
  } else {
    console.error(`[orchestrator][${tag}] code-scanner rejeté:`, codeSettled.reason);
  }

  if (npmSettled.status === "fulfilled") {
    console.log(`[orchestrator][${tag}] npm audit stdout length: ${npmSettled.value.stdout.length} | exitCode: ${npmSettled.value.exitCode}`);
    const list = parseNpmAuditJson(npmSettled.value.stdout);
    console.log(`[orchestrator][${tag}] npm audit findings: ${list.length}`);
    for (const item of list) {
      vulnerabilities.push({ ...mapNpmAuditToOwasp(item), branch });
    }
  } else {
    console.error(`[orchestrator][${tag}] npm audit rejeté:`, npmSettled.reason);
  }

  const score = computeScore(vulnerabilities);
  console.log(`[orchestrator][${tag}] Total findings: ${vulnerabilities.length} | Score: ${score}`);
  return { score, totalFindings: vulnerabilities.length, vulnerabilities };
}
