# Backend SecureScan

Analyse de sécurité des dépôts GitHub : une URL en entrée, un rapport (score, grade, vulnérabilités) en sortie. Aucune base de données.

---

## Architecture

```
URL GitHub  →  validation  →  clone  →  scan (3 outils)  →  agrégation  →  score  →  JSON
```

1. **Validation** — URL restreinte à `github.com`, format `owner/repo`, limites anti-DoS.
2. **Clone** — Répertoire temporaire, `git clone --depth 1`, suppression après usage.
3. **Scan** — Semgrep (règles de sécu), npm audit (dépendances), TruffleHog (secrets), en parallèle.
4. **Agrégation** — Résultats normalisés, catégorisation OWASP Top 10.
5. **Score** — 100 moins des pénalités par gravité (CRITICAL 20, HIGH 15, MEDIUM 10, LOW 5). Grade A à F.

---

## API

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `/api/scan-from-github` | POST | Scan à partir d’une URL GitHub (usage principal). |
| `/api/scan` | POST | Scan d’un chemin local (tests). |

**Entrée (scan-from-github)** : `{ "url": "https://github.com/owner/repo" }`  
**Sortie** : `{ "score", "grade", "totalFindings", "vulnerabilities" }`

---

## Stack

- **Runtime** : Node.js (Next.js API Routes)
- **Outils** : Semgrep, npm audit, TruffleHog (CLI)
- **Validation** : `parseGitHubUrl` (lib/github), constante partagée pour la longueur d’URL

---

## Structure du code

- `src/app/api/` — Routes (scan-from-github, scan)
- `src/lib/orchestrator.ts` — Orchestration du scan (parallélisation, agrégation)
- `src/lib/scanners/` — Appels CLI (semgrep, npmAudit, trufflehog)
- `src/lib/parser.ts` — Parsing des sorties JSON
- `src/lib/owaspMapper.ts` — Mapping des findings vers OWASP Top 10
- `src/lib/score.ts` — Calcul du score et du grade
- `src/lib/github.ts` — Validation d’URL GitHub
- `src/lib/constants.ts` — Constantes partagées (ex. limite URL)

---

## Prérequis

Sur la machine : **git**, **semgrep**, **npm**, **trufflehog** (disponibles dans le PATH).
