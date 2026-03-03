import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Exécute npm audit dans le repo (nécessite package-lock.json), retourne stdout JSON.
export interface NpmAuditScanResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runNpmAudit(repoPath: string): Promise<NpmAuditScanResult> {
  const cwd = path.resolve(repoPath);
  try {
    const { stdout, stderr } = await execAsync("npm audit --json", {
      cwd,
      maxBuffer: 5 * 1024 * 1024,
      timeout: 60000,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}
