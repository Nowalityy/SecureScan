import type { Vulnerability } from "./types";

// npm audit → toujours supply chain (dépendances)
export function mapNpmAuditToOwasp(item: Omit<Vulnerability, "owaspCategory">): Vulnerability {
  return { ...item, owaspCategory: "A03 Software Supply Chain Failures" };
}

export function mapTruffleHogToOwasp(item: Omit<Vulnerability, "owaspCategory">): Vulnerability {
  return { ...item, owaspCategory: "A04 Cryptographic Failures" };
}

// Semgrep : mapping par mots-clés (rule_id / message) vers catégories OWASP Top 10
export function mapSemgrepToOwasp(
  item: Omit<Vulnerability, "owaspCategory"> & { checkId?: string }
): Vulnerability {
  const id = (item.checkId ?? "").toLowerCase();
  const msg = (item.description ?? "").toLowerCase();
  const text = `${id} ${msg}`;

  if (text.includes("cors") || text.includes("header") || text.includes("config")) {
    return { ...item, owaspCategory: "A02 Security Misconfiguration" };
  }
  if (
    text.includes("auth") ||
    text.includes("access") ||
    text.includes("permission") ||
    text.includes("role")
  ) {
    return { ...item, owaspCategory: "A01 Broken Access Control" };
  }
  return { ...item, owaspCategory: "A06 Insecure Design" };
}
