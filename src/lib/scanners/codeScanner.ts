import fs from "fs";
import path from "path";
import type { Vulnerability, OwaspCategory, Severity } from "@/lib/types";
import { walkDir, MAX_FILE_SIZE } from "./fileWalker";

interface CodePattern {
  name: string;
  regex: RegExp;
  severity: Severity;
  owaspCategory: OwaspCategory;
  // Extensions concernées (undefined = tous les fichiers texte)
  exts?: Set<string>;
}

const JS_TS_EXTS = new Set([".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"]);
const WEB_EXTS   = new Set([".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs", ".html", ".vue", ".svelte"]);
const ALL_EXTS   = undefined;

const CODE_PATTERNS: CodePattern[] = [
  // ── A03 Injection ──────────────────────────────────────────────────────────
  {
    name: "SQL Injection — concaténation de chaîne",
    regex: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s[^;'"]*\+\s*(?:req\.|params\.|query\.|body\.|user\.|input\b)/i,
    severity: "CRITICAL",
    owaspCategory: "A03 Injection",
    exts: JS_TS_EXTS,
  },
  {
    name: "SQL Injection — template literal non paramétré",
    regex: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^;`]*\$\{(?:req|params|query|body|user|input|id)[^}]*\}/i,
    severity: "CRITICAL",
    owaspCategory: "A03 Injection",
    exts: JS_TS_EXTS,
  },
  {
    name: "eval() — exécution de code arbitraire",
    regex: /\beval\s*\(/,
    severity: "HIGH",
    owaspCategory: "A03 Injection",
    exts: JS_TS_EXTS,
  },
  {
    name: "Injection shell — exec avec entrée utilisateur",
    regex: /(?:exec|execSync|spawn|spawnSync)\s*\(\s*(?:`[^`]*\$\{(?:req|params|query|body|user|input)[^}]*\}|[^)]*\+\s*(?:req|params|query|body|user|input))/i,
    severity: "CRITICAL",
    owaspCategory: "A03 Injection",
    exts: JS_TS_EXTS,
  },
  {
    name: "XSS — innerHTML avec variable",
    regex: /\.innerHTML\s*[+]?=\s*(?!['"`]<)/,
    severity: "HIGH",
    owaspCategory: "A03 Injection",
    exts: WEB_EXTS,
  },
  {
    name: "XSS — document.write()",
    regex: /document\.write\s*\(/,
    severity: "HIGH",
    owaspCategory: "A03 Injection",
    exts: WEB_EXTS,
  },
  {
    name: "XSS — dangerouslySetInnerHTML",
    regex: /dangerouslySetInnerHTML\s*=\s*\{\s*\{/,
    severity: "HIGH",
    owaspCategory: "A03 Injection",
    exts: WEB_EXTS,
  },

  // ── A01 Broken Access Control ───────────────────────────────────────────────
  {
    name: "Exposition de credentials dans une réponse API",
    regex: /(?:credentials|secrets)\s*[=:]\s*\{/i,
    severity: "CRITICAL",
    owaspCategory: "A01 Broken Access Control",
    exts: JS_TS_EXTS,
  },
  {
    name: "IDOR — accès aux données utilisateur par paramètre d'URL sans vérification",
    regex: /(?:find|filter|lookup)\s*\([^)]*params\.|params\.\w*[iI][dD]\b/i,
    severity: "HIGH",
    owaspCategory: "A01 Broken Access Control",
    exts: JS_TS_EXTS,
  },
  {
    name: "Contournement d'authentification — isAdmin hardcodé",
    regex: /(?:isAdmin|isAuthenticated|isSuperUser|isRoot)\s*[=:]\s*true\b/i,
    severity: "CRITICAL",
    owaspCategory: "A01 Broken Access Control",
    exts: JS_TS_EXTS,
  },
  {
    name: "Accès admin sans vérification",
    regex: /\/admin|role\s*===\s*['"]admin['"]|req\.user\.admin\s*===\s*true/i,
    severity: "HIGH",
    owaspCategory: "A01 Broken Access Control",
    exts: JS_TS_EXTS,
  },

  // ── A02 Security Misconfiguration ──────────────────────────────────────────
  {
    name: "CORS — toutes origines autorisées (*)",
    regex: /(?:origin\s*[:=]\s*['"]?\*['"]?|Access-Control-Allow-Origin[^,\n]*['"*]\*['"]?|set\s*\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]?\*['"]?\))/i,
    severity: "HIGH",
    owaspCategory: "A02 Security Misconfiguration",
    exts: ALL_EXTS,
  },
  {
    name: "Exposition de process.env complet",
    regex: /[^.a-zA-Z]process\.env(?!\.[A-Z_]+\b)(?:\s*[,}\]]|\s*$)/,
    severity: "CRITICAL",
    owaspCategory: "A02 Security Misconfiguration",
    exts: JS_TS_EXTS,
  },
  {
    name: "Mode debug activé en production",
    regex: /(?:publicDebug|DEBUG|debug)\s*[=:]\s*true\b(?!\s*\/\/.*(?:dev|test|local))/i,
    severity: "HIGH",
    owaspCategory: "A02 Security Misconfiguration",
    exts: ALL_EXTS,
  },
  {
    name: "URL HTTP non sécurisée (hors localhost)",
    regex: /['"]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[\w.-]+/i,
    severity: "MEDIUM",
    owaspCategory: "A02 Security Misconfiguration",
    exts: ALL_EXTS,
  },
  {
    name: "Désactivation vérification SSL/TLS",
    regex: /(?:rejectUnauthorized|verify)\s*[=:]\s*false\b|ssl[_\-]?verify\s*[=:]\s*(?:false|0)\b/i,
    severity: "HIGH",
    owaspCategory: "A02 Security Misconfiguration",
    exts: JS_TS_EXTS,
  },

  // ── A04 Cryptographic Failures ─────────────────────────────────────────────
  {
    name: "Algorithme MD5 (non sécurisé)",
    regex: /\bmd5\s*\(|createHash\s*\(\s*['"]md5['"]\s*\)/i,
    severity: "CRITICAL",
    owaspCategory: "A04 Cryptographic Failures",
    exts: JS_TS_EXTS,
  },
  {
    name: "AES-ECB — mode de chiffrement non sécurisé",
    regex: /createCipheriv\s*\(\s*['"][^'"]*ecb[^'"]*['"]/i,
    severity: "CRITICAL",
    owaspCategory: "A04 Cryptographic Failures",
    exts: JS_TS_EXTS,
  },
  {
    name: "Clé cryptographique hardcodée",
    regex: /(?:const|let|var)\s+\w*(?:key|secret|iv|salt)\w*\s*=\s*['"][^'"]{4,}['"]/i,
    severity: "CRITICAL",
    owaspCategory: "A04 Cryptographic Failures",
    exts: JS_TS_EXTS,
  },
  {
    name: "Algorithme SHA-1 (non sécurisé)",
    regex: /createHash\s*\(\s*['"]sha1['"]\s*\)/i,
    severity: "HIGH",
    owaspCategory: "A04 Cryptographic Failures",
    exts: JS_TS_EXTS,
  },
  {
    name: "Math.random() utilisé pour cryptographie",
    regex: /Math\.random\s*\(\s*\).*(?:token|secret|key|password|salt|nonce|iv\b)/i,
    severity: "HIGH",
    owaspCategory: "A04 Cryptographic Failures",
    exts: JS_TS_EXTS,
  },

  // ── A06 Insecure Design ────────────────────────────────────────────────────
  {    name: "Token de sécurité prévisible (base64 sans entropie)",
    regex: /Buffer\.from\([^)]+\)\.toString\s*\(\s*['"]base64['"]\s*\)/i,
    severity: "HIGH",
    owaspCategory: "A06 Insecure Design",
    exts: JS_TS_EXTS,
  },
  {    name: "TODO / FIXME sécurité non résolu",
    regex: /\/\/\s*(?:TODO|FIXME|HACK|XXX)[^\n]*(?:auth|security|sanitize|escape|inject|xss|sql|crypt)/i,
    severity: "LOW",
    owaspCategory: "A06 Insecure Design",
    exts: ALL_EXTS,
  },
  {
    name: "Console.log de données sensibles",
    regex: /console\.(?:log|warn|error)\s*\([^)]*(?:password|passwd|secret|token|key|card|ssn|credit)/i,
    severity: "MEDIUM",
    owaspCategory: "A06 Insecure Design",
    exts: JS_TS_EXTS,
  },
];

export function runCodeScanner(repoPath: string): Vulnerability[] {
  const vulnerabilities: Vulnerability[] = [];
  const files = walkDir(repoPath);

  console.log(`[code-scanner] ${files.length} fichier(s) à analyser`);

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();

    try {
      const stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_SIZE) continue;

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const relPath = path.relative(repoPath, filePath).replace(/\\/g, "/");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Ignorer les lignes commentées (hors règle TODO/FIXME)
        const trimmed = line.trim();
        const isComment = trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*");

        for (const pattern of CODE_PATTERNS) {
          // Filtrer les extensions si précisées
          if (pattern.exts && !pattern.exts.has(ext)) continue;
          // Ignorer les lignes commentées sauf pour TODO/FIXME
          if (isComment && !pattern.name.includes("TODO")) continue;

          if (pattern.regex.test(line)) {
            // Évite les doublons sur le même fichier/ligne/règle
            const alreadyFound = vulnerabilities.some(
              (v) => v.file === relPath && v.line === i + 1 && v.description === pattern.name
            );
            if (!alreadyFound) {
              console.log(`[code-scanner] TROUVÉ: ${pattern.name} — ${relPath}:${i + 1}`);
              vulnerabilities.push({
                tool: "code-scanner",
                file: relPath,
                line: i + 1,
                description: pattern.name,
                severity: pattern.severity,
                owaspCategory: pattern.owaspCategory,
              });
            }
          }
        }
      }
    } catch {
      // fichier illisible, on ignore
    }
  }

  console.log(`[code-scanner] Total findings: ${vulnerabilities.length}`);
  return vulnerabilities;
}
