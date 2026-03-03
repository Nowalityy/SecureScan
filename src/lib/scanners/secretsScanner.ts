import fs from "fs";
import path from "path";
import type { Vulnerability } from "@/lib/types";
import { walkDir, MAX_FILE_SIZE } from "./fileWalker";

interface SecretPattern {
  name: string;
  regex: RegExp;
  severity: "HIGH" | "CRITICAL";
}

const SECRET_PATTERNS: SecretPattern[] = [
  // Clés cloud
  { name: "AWS Access Key ID",           regex: /AKIA[0-9A-Z]{16}/,                                                                   severity: "CRITICAL" },
  { name: "AWS Secret Access Key",       regex: /aws[_\-.]?secret[_\-.]?(?:access[_\-.]?)?key\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}/i,  severity: "CRITICAL" },
  { name: "Google API Key",              regex: /AIza[0-9A-Za-z\-_]{35}/,                                                             severity: "CRITICAL" },
  { name: "Stripe Live Key",             regex: /sk_live_[0-9A-Za-z]{24,}/,                                                           severity: "CRITICAL" },
  // Tokens VCS
  { name: "GitHub Token (ghp)",          regex: /ghp_[A-Za-z0-9]{36}/,                                                               severity: "CRITICAL" },
  { name: "GitHub Token (PAT)",          regex: /github_pat_[A-Za-z0-9_]{82}/,                                                       severity: "CRITICAL" },
  { name: "GitHub Token (gho/ghu)",      regex: /gh[osu]_[A-Za-z0-9]{36}/,                                                           severity: "HIGH" },
  { name: "GitLab Token",                regex: /glpat-[A-Za-z0-9\-_]{20}/,                                                          severity: "HIGH" },
  // Tokens services
  { name: "Slack Token",                 regex: /xox[baprs]-[0-9A-Za-z\-]{10,}/,                                                     severity: "HIGH" },
  { name: "Slack Webhook",               regex: /hooks\.slack\.com\/services\/[A-Za-z0-9_\/]{40,}/,                                  severity: "HIGH" },
  { name: "Twilio Account SID",          regex: /AC[a-zA-Z0-9]{32}/,                                                                  severity: "HIGH" },
  { name: "SendGrid API Key",            regex: /SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}/,                                       severity: "HIGH" },
  // Clés privées
  { name: "Private Key (PEM)",           regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,                            severity: "CRITICAL" },
  // Credentials hardcodés
  { name: "Password hardcoded",          regex: /(?:password|passwd|pwd|pass)\s*[=:]\s*['"][^'"]{4,}['"]/i,                          severity: "HIGH" },
  { name: "Secret hardcoded",            regex: /(?:secret|api[_\-]?key|auth[_\-]?token)\s*[=:]\s*['"][^'"]{8,}['"]/i,             severity: "HIGH" },
  { name: "JWT Secret hardcoded",        regex: /jwt[_\-.]?secret\s*[=:]\s*['"][^'"]{8,}['"]/i,                                     severity: "HIGH" },
  // Connexion base de données
  { name: "Database URL with credentials", regex: /(?:mongodb|mysql|postgres|postgresql|redis):\/\/[^:]+:[^@]{3,}@/i,               severity: "CRITICAL" },
];

// Contextes à ignorer (tests, exemples, documentation)
const SAFE_CONTEXT = /(?:example|sample|dummy|fake|test|mock|placeholder|your[_\-]?key|<[^>]+>|\$\{[^}]+\})/i;

export function runSecretsScanner(repoPath: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];
  const files = walkDir(repoPath);

  console.log(`[secrets-scanner] ${files.length} fichier(s) à analyser`);

  for (const filePath of files) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_SIZE) continue;

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const relPath = path.relative(repoPath, filePath).replace(/\\/g, "/");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Ignore les commentaires qui ressemblent à des exemples
        if (SAFE_CONTEXT.test(line)) continue;

        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(line)) {
            const alreadyFound = vulnerabilities.some(
              (v) => v.file === relPath && v.line === i + 1 && v.description === pattern.name
            );
            if (!alreadyFound) {
              console.log(`[secrets-scanner] TROUVÉ: ${pattern.name} — ${relPath}:${i + 1}`);
              vulnerabilities.push({
                tool: "secrets-scanner",
                file: relPath,
                line: i + 1,
                description: pattern.name,
                severity: pattern.severity,
                owaspCategory: "A04 Cryptographic Failures",
              });
            }
          }
        }
      }
    } catch {
      // fichier illisible, on ignore
    }
  }

  console.log(`[secrets-scanner] Total secrets trouvés: ${vulnerabilities.length}`);
  return vulnerabilities;
}
