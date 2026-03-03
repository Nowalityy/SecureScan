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

export interface TruffleHogResult {
  Findings?: Array<{
    Redacted?: string;
    Path?: string;
    Line?: number;
    DetectorName?: string;
  }>;
}

export function parseSemgrepJson(stdout: string): Array<Omit<Vulnerability, "owaspCategory"> & { checkId?: string }> {
  const out: Array<Omit<Vulnerability, "owaspCategory"> & { checkId?: string }> = [];
  try {
    const data = JSON.parse(stdout) as SemgrepResult;
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
  } catch {
  }
  return out;
}

export function parseNpmAuditJson(stdout: string): Array<Omit<Vulnerability, "owaspCategory" | "line">> {
  const out: Array<Omit<Vulnerability, "owaspCategory" | "line">> = [];
  try {
    const data = JSON.parse(stdout) as NpmAuditResult;
    for (const [pkg, info] of Object.entries(data.vulnerabilities ?? {})) {
      out.push({
        tool: "npm-audit",
        file: pkg,
        description: info.via?.[0]?.title ?? pkg,
        severity: npmSeverity(info.severity),
      });
    }
  } catch {
  }
  return out;
}

export function parseTruffleHogJson(stdout: string): Array<Omit<Vulnerability, "owaspCategory">> {
  const out: Array<Omit<Vulnerability, "owaspCategory">> = [];
  try {
    const data = JSON.parse(stdout) as TruffleHogResult;
    for (const f of data.Findings ?? []) {
      out.push({
        tool: "trufflehog",
        file: f.Path ?? "",
        line: f.Line,
        description: f.DetectorName ?? f.Redacted ?? "Secret detected",
        severity: "HIGH",
      });
    }
  } catch {
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
