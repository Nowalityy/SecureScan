// Types partagés entre API, orchestrateur et front (rapport)
export type OwaspCategory =
  | "A01 Broken Access Control"
  | "A02 Security Misconfiguration"
  | "A03 Injection"
  | "A03 Software Supply Chain Failures"
  | "A04 Cryptographic Failures"
  | "A06 Insecure Design"
  | "A07 Auth Failures";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface Vulnerability {
  tool: string;
  file: string;
  line?: number;
  description: string;
  severity: Severity;
  owaspCategory: OwaspCategory;
  branch?: string; // branche git d'origine
}

export interface ScanRequest {
  repoPath: string;
}

export interface ScanResponse {
  score: number;
  grade: Grade;
  totalFindings: number;
  vulnerabilities: Vulnerability[];
}
