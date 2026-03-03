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
  const cmd = `trufflehog git ${fileUrl} --json`;
  console.log(`[trufflehog] Lancement: ${cmd}`);
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: dir,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
    });
    console.log(`[trufflehog] OK — stdout: ${stdout.length} chars | stderr: ${stderr.length} chars`);
    if (stderr) console.warn(`[trufflehog] stderr:`, stderr.slice(0, 500));
    console.log(`[trufflehog] stdout preview:`, stdout.slice(0, 300));
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    console.error(`[trufflehog] ERREUR — exitCode: ${e.code} | message: ${e.message?.slice(0, 200)}`);
    console.error(`[trufflehog] stderr:`, (e.stderr ?? "").slice(0, 500));
    console.log(`[trufflehog] stdout malgré erreur:`, (e.stdout ?? "").slice(0, 300));
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}
