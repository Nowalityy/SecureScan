import type { Vulnerability, Severity, Grade } from "./types";

// Pénalités par finding (100 − total = score final)
const penalites: Record<Severity, number> = {
  CRITICAL: 20,
  HIGH: 15,
  MEDIUM: 10,
  LOW: 5,
};

export function computeScore(findings: Vulnerability[]): number {
  let totalPenalites = 0;
  for (const f of findings) {
    totalPenalites += penalites[f.severity] ?? 0;
  }
  return Math.max(0, 100 - totalPenalites);
}

export function computeGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
