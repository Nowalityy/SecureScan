import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

// Exécute TruffleHog sur le repo (secrets), retourne stdout JSON.
export interface TruffleHogScanResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runTruffleHog(repoPath: string): Promise<TruffleHogScanResult> {
  const dir = path.resolve(repoPath);
  const fileUrl = dir.startsWith("/")
    ? `file://${dir}`
    : `file:///${dir.replace(/\\/g, "/")}`;
  try {
    const { stdout, stderr } = await execAsync(`trufflehog git ${fileUrl} --json`, {
      cwd: dir,
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
