import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

// Exécute npm audit dans le repo (nécessite package-lock.json), retourne stdout JSON.
export interface NpmAuditScanResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runNpmAudit(repoPath: string): Promise<NpmAuditScanResult> {
  const cwd = path.resolve(repoPath);
  const cmd = "npm audit --json";
  console.log(`[npm-audit] Lancement: ${cmd} dans ${cwd}`);
  // Vérifie la présence de package.json et package-lock.json
  const hasPkg = fs.existsSync(path.join(cwd, "package.json"));
  const hasLock = fs.existsSync(path.join(cwd, "package-lock.json"));
  console.log(`[npm-audit] package.json: ${hasPkg} | package-lock.json: ${hasLock}`);
  if (!hasPkg) {
    console.warn(`[npm-audit] Pas de package.json — npm audit ignoré`);
    return { stdout: "", stderr: "no package.json", exitCode: 1 };
  }
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      maxBuffer: 5 * 1024 * 1024,
      timeout: 60000,
    });
    console.log(`[npm-audit] OK — stdout: ${stdout.length} chars`);
    console.log(`[npm-audit] stdout preview:`, stdout.slice(0, 300));
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    console.error(`[npm-audit] ERREUR — exitCode: ${e.code} | message: ${e.message?.slice(0, 200)}`);
    console.error(`[npm-audit] stderr:`, (e.stderr ?? "").slice(0, 500));
    console.log(`[npm-audit] stdout malgré erreur (peut contenir les vulns):`, (e.stdout ?? "").slice(0, 300));
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}
