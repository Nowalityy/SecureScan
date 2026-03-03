import type { Vulnerability, Severity } from "./types";

// Structures brutes renvoyées par chaque outil (JSON)
export interface SemgrepResult {
  results?: Array<{
    check_id?: string;
    path?: string;
    start?: { line?: number };
    extra?: { message?: string; severity?: string };
    rule_id?: string;
  }>;
}

export interface NpmAuditResult {
  vulnerabilities?: Record<
    string,
    {
      severity?: string;
      via?: Array<{ title?: string; url?: string }>;
    }
  >;
}

// TruffleHog --json produit du NDJSON (1 objet JSON par ligne, pas de tableau)
export interface TruffleHogFinding {
  DetectorName?: string;
  Redacted?: string;
  Verified?: boolean;
  SourceMetadata?: {
    Data?: {
      Git?: { file?: string; line?: number };
      Filesystem?: { file?: string };
    };
  };
}

export function parseSemgrepJson(stdout: string): Array<Omit<Vulnerability, "owaspCategory"> & { checkId?: string }> {
  const out: Array<Omit<Vulnerability, "owaspCategory"> & { checkId?: string }> = [];
  if (!stdout.trim()) {
    console.warn("[parser][semgrep] stdout vide");
    return out;
  }
  try {
    const data = JSON.parse(stdout) as SemgrepResult;
    console.log(`[parser][semgrep] results dans le JSON: ${data.results?.length ?? 0}`);
    for (const match of data.results ?? []) {
      const ruleId = match.rule_id ?? match.check_id ?? "";
      const msg = match.extra?.message ?? "";
      out.push({
        tool: "semgrep",
        file: match.path ?? "",
        line: match.start?.line,
        description: msg || ruleId || "Semgrep finding",
        severity: semgrepSeverity(match.extra?.severity),
        checkId: ruleId || undefined,
      });
    }
  } catch (e) {
    console.error("[parser][semgrep] JSON parse error:", e);
  }
  return out;
}

export function parseNpmAuditJson(stdout: string): Array<Omit<Vulnerability, "owaspCategory" | "line">> {
  const out: Array<Omit<Vulnerability, "owaspCategory" | "line">> = [];
  if (!stdout.trim()) {
    console.warn("[parser][npm-audit] stdout vide");
    return out;
  }
  try {
    const data = JSON.parse(stdout) as NpmAuditResult;
    const entries = Object.entries(data.vulnerabilities ?? {});
    console.log(`[parser][npm-audit] vulns dans le JSON: ${entries.length}`);
    for (const [pkg, info] of entries) {
      out.push({
        tool: "npm-audit",
        file: pkg,
        description: info.via?.[0]?.title ?? pkg,
        severity: npmSeverity(info.severity),
      });
    }
  } catch (e) {
    console.error("[parser][npm-audit] JSON parse error:", e);
  }
  return out;
}

// TruffleHog --json = NDJSON : une ligne JSON par secret, pas un tableau unique
export function parseTruffleHogJson(stdout: string): Array<Omit<Vulnerability, "owaspCategory">> {
  const out: Array<Omit<Vulnerability, "owaspCategory">> = [];
  if (!stdout.trim()) {
    console.warn("[parser][trufflehog] stdout vide");
    return out;
  }
  const lines = stdout.split("\n").filter((l) => l.trim());
  console.log(`[parser][trufflehog] lignes NDJSON à parser: ${lines.length}`);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const f = JSON.parse(trimmed) as TruffleHogFinding;
      const gitData = f.SourceMetadata?.Data?.Git;
      const fsData = f.SourceMetadata?.Data?.Filesystem;
      console.log(`[parser][trufflehog] secret trouvé: ${f.DetectorName} | file: ${gitData?.file ?? fsData?.file ?? "?"} | verified: ${f.Verified}`);
      out.push({
        tool: "trufflehog",
        file: gitData?.file ?? fsData?.file ?? "",
        line: gitData?.line,
        description: f.DetectorName ?? f.Redacted ?? "Secret detected",
        severity: "HIGH",
      });
    } catch (e) {
      console.error("[parser][trufflehog] line parse error:", e, "|", trimmed.slice(0, 120));
    }
  }
  return out;
}

function semgrepSeverity(s?: string): Severity {
  const x = (s ?? "").toUpperCase();
  if (x === "ERROR" || x === "CRITICAL") return "CRITICAL";
  if (x === "WARNING") return "HIGH";
  if (x === "INFO") return "MEDIUM";
  return "LOW";
}

function npmSeverity(s?: string): Severity {
  const x = (s ?? "").toLowerCase();
  if (x === "critical") return "CRITICAL";
  if (x === "high") return "HIGH";
  if (x === "moderate") return "MEDIUM";
  return "LOW";
}
