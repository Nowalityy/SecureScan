import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Exécute Semgrep (config auto) sur le repo, retourne stdout JSON.
export interface SemgrepScanResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runSemgrep(repoPath: string): Promise<SemgrepScanResult> {
  const cwd = path.resolve(repoPath);
  try {
    const { stdout, stderr } = await execAsync("semgrep --config auto . --json", {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
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
