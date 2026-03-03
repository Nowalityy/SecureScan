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
  const cmd = "semgrep --config auto . --json";
  console.log(`[semgrep] Lancement: ${cmd} dans ${cwd}`);
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    });
    console.log(`[semgrep] OK — stdout: ${stdout.length} chars | stderr: ${stderr.length} chars`);
    if (stderr) console.warn(`[semgrep] stderr:`, stderr.slice(0, 500));
    console.log(`[semgrep] stdout preview:`, stdout.slice(0, 300));
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    console.error(`[semgrep] ERREUR — exitCode: ${e.code} | message: ${e.message?.slice(0, 200)}`);
    console.error(`[semgrep] stderr:`, (e.stderr ?? "").slice(0, 500));
    console.log(`[semgrep] stdout malgré erreur:`, (e.stdout ?? "").slice(0, 300));
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}
