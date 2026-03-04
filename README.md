# SecureScan — Documentation complète

> **Pour qui est ce document ?**  
> Pour toute personne qui découvre le projet. Après l'avoir lu, vous serez capable d'expliquer comment SecureScan fonctionne, fichier par fichier, ligne par ligne. Aucun prérequis particulier en sécurité ou en développement web avancé n'est nécessaire — tout est expliqué.

---

## Sommaire

1. [Qu'est-ce que SecureScan ?](#1-quest-ce-que-securescan-)
2. [La grande image — comment tout s'articule](#2-la-grande-image--comment-tout-sarticule)
3. [Installation et démarrage](#3-installation-et-démarrage)
4. [Structure des dossiers](#4-structure-des-dossiers)
5. [Étape 1 — La page d'accueil et le formulaire](#5-étape-1--la-page-daccueil-et-le-formulaire)
6. [Étape 2 — La route API de scan](#6-étape-2--la-route-api-de-scan)
7. [Étape 3 — Les scanners de sécurité](#7-étape-3--les-scanners-de-sécurité)
8. [Étape 4 — Le calcul du score et de la note](#8-étape-4--le-calcul-du-score-et-de-la-note)
9. [Étape 5 — La page de rapport](#9-étape-5--la-page-de-rapport)
10. [Étape 6 — L'export PDF](#10-étape-6--lexport-pdf)
11. [Étape 7 — La correction IA avec Gemini](#11-étape-7--la-correction-ia-avec-gemini)
12. [Étape 8 — Le bot GitHub et les Pull Requests automatiques](#12-étape-8--le-bot-github-et-les-pull-requests-automatiques)
13. [Les types TypeScript partagés](#13-les-types-typescript-partagés)
14. [Sécurité intégrée dans le code](#14-sécurité-intégrée-dans-le-code)
15. [Variables d'environnement](#15-variables-denvironnement)
16. [Résumé du flux complet](#16-résumé-du-flux-complet)

---

## 1. Qu'est-ce que SecureScan ?

SecureScan est une application web qui permet à un développeur de **coller l'URL d'un dépôt GitHub public** et d'obtenir en quelques secondes :

- Un **score de sécurité** sur 100
- Une **note lettrée** (A, B, C, D, F) comme à l'école
- La liste détaillée de toutes les **vulnérabilités détectées** dans le code, classées par sévérité
- Des **recommandations** concrètes pour corriger les problèmes
- La possibilité de **demander à une IA (Gemini)** de corriger un fichier vulnérable
- La possibilité de **créer une Pull Request automatique** sur le dépôt avec le correctif

Le tout sans stocker la moindre donnée : le dépôt est cloné dans un dossier temporaire, analysé, puis immédiatement supprimé.

---

## 2. La grande image — comment tout s'articule

Voici le voyage d'une requête de la saisie de l'URL jusqu'au rapport final :

```
Utilisateur tape une URL GitHub
         │
         ▼
┌─────────────────────┐
│   Page d'accueil    │  (src/app/page.tsx)
│   + Formulaire      │  (src/components/ScanForm.tsx)
└────────┬────────────┘
         │  POST /api/scan-from-github
         ▼
┌─────────────────────────────────────┐
│  Route API scan-from-github         │  (src/app/api/scan-from-github/route.ts)
│  1. Valide et parse l'URL           │
│  2. Clone le repo dans /tmp         │
│  3. Liste toutes les branches       │
│  4. Pour chaque branche : scan      │
│  5. Dédoublonne les findings        │
│  6. Calcule score + grade           │
│  7. Renvoie le JSON de résultats    │
└────────┬────────────────────────────┘
         │  Appelle l'orchestrateur
         ▼
┌─────────────────────────────────────┐
│  Orchestrateur                      │  (src/lib/orchestrator.ts)
│  Lance 3 scanners en parallèle :    │
│  • Secrets Scanner                  │
│  • Code Scanner                     │
│  • npm audit                        │
└────────┬────────────────────────────┘
         │  Findings agrégés
         ▼
┌─────────────────────────────────────┐
│  Score + Grade                      │  (src/lib/score.ts)
└─────────────────────────────────────┘
         │  JSON de résultats
         ▼
┌─────────────────────────────────────┐
│  Page rapport                       │  (src/app/report/page.tsx)
│  • Affiche score / grade / findings │
│  • Bouton export PDF                │
│  • Bouton correction IA             │
│  • Bouton créer une PR              │
└─────────────────────────────────────┘
```

---

## 3. Installation et démarrage

### Prérequis

- **Node.js 18+** installé
- **Git** installé et accessible dans le terminal (la commande `git` doit fonctionner)
- Un compte Google AI Studio pour la clé Gemini (optionnel — uniquement pour la correction IA)

### Étapes

```bash
# 1. Cloner le projet
git clone https://github.com/Nowalityy/SecureScan.git
cd SecureScan/securescan_github_repo/SecureScan

# 2. Installer les dépendances
npm install

# 3. Créer le fichier de variables d'environnement
```

Créer un fichier `.env.local` à la racine du projet :

```env
# Clé API Gemini — obtenir sur https://aistudio.google.com/apikey
GEMINI_API_KEY=votre_cle_ici

# Token GitHub d'un compte bot — nécessaire pour créer des PRs automatiques
# Créer un compte GitHub dédié (ex: mon-projet-bot), générer un token "classic"
# avec le scope "repo", et le coller ici
GITHUB_BOT_TOKEN=votre_token_bot_ici
```

```bash
# 4. Lancer en développement
npm run dev
```

L'application est disponible sur **http://localhost:3000**.

---

## 4. Structure des dossiers

```
src/
├── app/                        # Pages et routes Next.js (App Router)
│   ├── page.tsx                # Page d'accueil
│   ├── layout.tsx              # Layout global (HTML, polices, méta)
│   ├── globals.css             # Styles globaux Tailwind
│   ├── report/
│   │   └── page.tsx            # Page de rapport (résultats du scan)
│   └── api/
│       ├── scan-from-github/   # Route principale : lance le scan
│       │   └── route.ts
│       ├── fix-with-ai/        # Route : correction IA via Gemini
│       │   └── route.ts
│       └── create-fix-pr/      # Route : crée une PR GitHub avec le fix
│           └── route.ts
│
├── components/                 # Composants React réutilisables
│   ├── ScanForm.tsx            # Formulaire de saisie de l'URL
│   ├── ErrorAlert.tsx          # Bannière d'erreur
│   └── ui/                    # Composants shadcn/ui (Button, Badge, Card…)
│
├── lib/                        # Logique métier (côté serveur)
│   ├── types.ts                # Types TypeScript partagés
│   ├── constants.ts            # Constantes partagées front/back
│   ├── github.ts               # Parsing et validation des URLs GitHub
│   ├── orchestrator.ts         # Chef d'orchestre des scanners
│   ├── score.ts                # Calcul du score et de la note
│   ├── parser.ts               # Parsing des résultats npm audit
│   ├── owaspMapper.ts          # Mapping vers les catégories OWASP
│   ├── utils.ts                # Utilitaires divers
│   ├── gemini.ts               # Intégration IA Gemini (correction de code)
│   ├── githubBot.ts            # Bot GitHub (fork, branch, commit, PR)
│   ├── pdfExport.ts            # Export du rapport au format PDF
│   └── scanners/
│       ├── fileWalker.ts       # Parcours récursif des fichiers
│       ├── secretsScanner.ts   # Détection de secrets dans le code
│       ├── codeScanner.ts      # Détection de patterns de code vulnérable
│       └── npmAudit.ts         # Audit des dépendances npm
│
└── types/                      # Types TypeScript pour l'API GitHub
    └── github.ts
```

---

## 5. Étape 1 — La page d'accueil et le formulaire

### `src/app/page.tsx`

C'est la première chose que l'utilisateur voit. C'est une page statique (rendu côté serveur, pas de `"use client"`) qui affiche :

- Une présentation de l'outil avec des statistiques (repos analysés, failles détectées, etc.)
- Le composant `ScanForm` pour entrer l'URL
- Des exemples de findings pour montrer à quoi ressemble un rapport

Il n'y a pas de logique complexe ici — c'est essentiellement du HTML stylé avec Tailwind CSS.

### `src/components/ScanForm.tsx`

C'est le formulaire de saisie. Voici comment il fonctionne :

```tsx
"use client"; // Ce composant tourne dans le navigateur (pas sur le serveur)

export default function ScanForm() {
  const router = useRouter(); // Pour naviguer vers /report après le scan
  const [url, setUrl] = useState(""); // Ce que l'utilisateur tape
  const [loading, setLoading] = useState(false); // Affiche "Scan en cours…"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // Empêche le rechargement de la page

    // 1. Envoie l'URL à l'API (côté serveur)
    const res = await fetch("/api/scan-from-github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: trimmed }),
    });

    const data = await res.json(); // Les résultats du scan

    // 2. Stocke le rapport dans sessionStorage
    //    sessionStorage = mémoire du navigateur pour l'onglet courant,
    //    effacée automatiquement quand l'onglet se ferme
    sessionStorage.setItem("securescan-report", JSON.stringify(data));
    sessionStorage.setItem("securescan-url", trimmed);

    // 3. Redirige vers la page de rapport
    router.push("/report");
  }
}
```

**Pourquoi `sessionStorage` ?** Parce que le serveur renvoie les données en JSON, et la page `/report` s'exécute dans le navigateur. Pour passer les données d'une page à l'autre sans passer par un serveur ni par l'URL (qui serait trop longue pour un rapport JSON), on utilise `sessionStorage` — une mémoire temporaire du navigateur, propre à chaque onglet.

---

## 6. Étape 2 — La route API de scan

### `src/app/api/scan-from-github/route.ts`

C'est le cœur du système. Cette route est appelée en `POST` par le formulaire. Elle reçoit `{ url: "https://github.com/user/repo" }` et renvoie le rapport complet.

#### Phase 1 — Récupération et validation de l'URL

```typescript
const body = await request.json();
const url = typeof body?.url === "string" ? body.url.trim() : "";

// parseGitHubUrl valide et extrait owner + repo
// Lance une exception si l'URL est invalide ou non-GitHub
const { owner, repo } = parseGitHubUrl(url);
const cloneUrl = `https://github.com/${owner}/${repo}`;
```

La fonction `parseGitHubUrl` (dans `src/lib/github.ts`) vérifie que l'URL :

- N'est pas trop longue (protection anti-DoS)
- Pointe bien vers `github.com` (protection anti-SSRF)
- Contient un `owner` et un `repo` valides selon les règles GitHub (protection anti-injection)

#### Phase 2 — Clonage du dépôt

```typescript
// Crée un dossier temporaire unique dans /tmp ou %TEMP%
// Exemple Windows : C:\Users\...\AppData\Local\Temp\securescan-a7f3r
// Exemple Linux   : /tmp/securescan-a7f3r
tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "securescan-"));

// Clone le repo dans ce dossier
// --no-single-branch : télécharge TOUTES les branches (pas seulement main)
// --depth 1          : seulement le dernier commit de chaque branche (plus rapide)
await execFileAsync(
  "git",
  ["clone", "--no-single-branch", "--depth", "1", cloneUrl, "."],
  {
    cwd: tempDir,
    timeout: 180000, // 3 minutes max avant d'abandonner
  },
);
```

`execFileAsync` est la version asynchrone de `child_process.execFile`. On s'en sert pour exécuter des commandes système (ici `git`) depuis Node.js.

> **Pourquoi `execFile` et pas `exec` ?**  
> `exec` passe la commande à un shell (`/bin/sh`), ce qui ouvre la porte aux injections shell.  
> `execFile` appelle directement le binaire `git` sans shell intermédiaire — c'est la façon sécurisée de lancer des processus externes.

#### Phase 3 — Scan multi-branches

```typescript
// Liste toutes les branches distantes disponibles sur le repo
const { stdout: branchesRaw } = await execFileAsync("git", ["branch", "-r"], {
  cwd: tempDir,
});
// branchesRaw ressemble à :
//   "  origin/main\n  origin/feature/login\n  origin/HEAD -> origin/main\n"

const branches = branchesRaw
  .split("\n")
  .map((b) => b.trim())
  .filter((b) => b && !b.includes("HEAD")) // retire la ligne "HEAD -> origin/main"
  .map((b) => b.replace(/^origin\//, "")); // retire le préfixe "origin/"
// Résultat final : ["main", "feature/login"]

// Pour chaque branche, on positionne le repo dessus et on scanne
for (const branch of branches) {
  await execFileAsync("git", ["checkout", branch], { cwd: tempDir });
  const branchResult = await runSecurityScan(tempDir, branch);
  allVulnerabilities.push(...branchResult.vulnerabilities);
}
```

Le scan multi-branches est une fonctionnalité différenciante : une vulnérabilité peut exister sur une branche de développement avant d'atteindre `main`. SecureScan les trouve toutes, quelle que soit la branche.

#### Phase 4 — Dédoublonnage

Quand on scanne plusieurs branches, la même faille peut apparaître plusieurs fois si le même fichier existe sur `main` et `feature/x`. On la dédoublonne tout en conservant la traçabilité des branches concernées :

```typescript
const dedupMap = new Map<string, Vulnerability>();

for (const v of allVulnerabilities) {
  // Clé unique = combinaison outil + fichier + ligne + description
  const key = `${v.tool}|${v.file}|${v.line ?? ""}|${v.description}`;

  if (dedupMap.has(key)) {
    // La faille existe déjà — on fusionne les informations de branches
    const existing = dedupMap.get(key)!;
    // Avant fusion : branch = "main"
    // Après fusion : branch = "main, feature/login"
    if (v.branch && !existing.branch?.split(", ").includes(v.branch)) {
      existing.branch = `${existing.branch}, ${v.branch}`;
    }
  } else {
    dedupMap.set(key, { ...v }); // Nouveau finding, on l'ajoute
  }
}
```

#### Phase 5 — Nettoyage (toujours exécuté)

```typescript
// Le bloc finally s'exécute TOUJOURS — même si une exception est levée plus haut.
// Cela garantit que le dossier temporaire est supprimé dans tous les cas.
finally {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Le dépôt cloné disparaît immédiatement après le scan.
    // Zéro donnée stockée, comme promis.
  }
}
```

---

## 7. Étape 3 — Les scanners de sécurité

L'orchestrateur (`src/lib/orchestrator.ts`) lance trois scanners **en parallèle** pour maximiser la vitesse :

```typescript
const [secretsSettled, codeSettled, npmSettled] = await Promise.allSettled([
  Promise.resolve(runSecretsScanner(resolvedPath)), // Scanner de secrets (synchrone)
  Promise.resolve(runCodeScanner(resolvedPath)), // Scanner de code (synchrone)
  runNpmAudit(resolvedPath), // Audit npm (asynchrone)
]);
```

`Promise.allSettled` (et non `Promise.all`) est utilisé intentionnellement : même si un scanner échoue (par exemple, `npm audit` plante sur un `package.json` corrompu), les deux autres continuent et leurs résultats sont pris en compte. Aucun scanner ne bloque les autres.

---

### Scanner 1 — `src/lib/scanners/secretsScanner.ts`

Ce scanner cherche des **secrets exposés dans le code** : clés API, tokens, mots de passe écrits en dur.

#### Comment il fonctionne

Il parcourt tous les fichiers du dépôt avec `walkDir`, lit leur contenu ligne par ligne, et teste chaque ligne contre une liste de patterns regex :

```typescript
const SECRET_PATTERNS = [
  // Clés cloud
  {
    name: "AWS Access Key ID",
    regex: /AKIA[0-9A-Z]{16}/,
    severity: "CRITICAL",
  },
  {
    name: "Google API Key",
    regex: /AIza[0-9A-Za-z\-_]{35}/,
    severity: "CRITICAL",
  },
  {
    name: "Stripe Live Key",
    regex: /sk_live_[0-9A-Za-z]{24,}/,
    severity: "CRITICAL",
  },

  // Tokens GitHub
  {
    name: "GitHub Token (ghp)",
    regex: /ghp_[A-Za-z0-9]{36}/,
    severity: "CRITICAL",
  },
  {
    name: "GitHub Token (PAT)",
    regex: /github_pat_[A-Za-z0-9_]{82}/,
    severity: "CRITICAL",
  },

  // Clés privées
  {
    name: "Private Key (PEM)",
    regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
    severity: "CRITICAL",
  },

  // Credentials hardcodés
  {
    name: "Password hardcoded",
    regex: /(?:password|passwd)\s*[=:]\s*['"][^'"]{4,}['"]/,
    severity: "HIGH",
  },
  {
    name: "Database URL",
    regex: /(?:mongodb|mysql|postgres):\/\/[^:]+:[^@]+@/,
    severity: "CRITICAL",
  },
  // ... 15+ patterns au total
];
```

Chaque pattern correspond à la signature exacte d'un type de secret. Par exemple, toutes les clés AWS commencent obligatoirement par `AKIA` suivi de 16 caractères alphanumériques majuscules — c'est imposé par Amazon. Le pattern est donc très fiable.

#### Anti-faux positifs

Pour éviter de signaler des lignes comme `const password = "EXAMPLE_PASSWORD"` dans de la documentation :

```typescript
const SAFE_CONTEXT =
  /(?:example|sample|dummy|fake|test|mock|placeholder|your[_\-]?key)/i;

for (const line of lines) {
  // Si la ligne ressemble à un exemple ou un placeholder, on l'ignore
  if (SAFE_CONTEXT.test(line)) continue;

  // Sinon on teste les patterns
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(line)) {
      /* trouver et enregistrer */
    }
  }
}
```

---

### Scanner 2 — `src/lib/scanners/codeScanner.ts`

Ce scanner cherche des **patterns de code structurellement dangereux** : SQL injection, XSS, `eval()`, algorithmes cryptographiques faibles, etc.

Il couvre les principales catégories du Top 10 OWASP :

```typescript
const CODE_PATTERNS = [
  // ── A03 Injection ──────────────────────────────────────────
  {
    name: "SQL Injection — template literal non paramétré",
    // Détecte :  `SELECT * FROM users WHERE id = ${req.params.id}`
    //                                              ^^^^^^^^^^^^^^^^^^^
    //                                              entrée utilisateur directement dans la requête
    regex:
      /(?:SELECT|INSERT|UPDATE|DELETE)[^;`]*\$\{(?:req|params|query|body)[^}]*\}/i,
    severity: "CRITICAL",
    owaspCategory: "A03 Injection",
    exts: JS_TS_EXTS, // Seulement les fichiers .js/.ts
  },
  {
    name: "eval() — exécution de code arbitraire",
    // Détecte : eval(userInput) → dangeureux : exécute du code JavaScript arbitraire
    regex: /\beval\s*\(/,
    severity: "HIGH",
    owaspCategory: "A03 Injection",
  },
  {
    name: "XSS — innerHTML avec variable",
    // Détecte : element.innerHTML = userInput
    //           → permet d'injecter du HTML/JS malveillant dans la page
    regex: /\.innerHTML\s*[+]?=\s*(?!['"`]<)/,
    severity: "HIGH",
    owaspCategory: "A03 Injection",
  },

  // ── A01 Broken Access Control ───────────────────────────────
  {
    name: "Contournement d'authentification — isAdmin hardcodé",
    // Détecte : isAdmin = true
    //           → n'importe qui sera considéré administrateur
    regex: /(?:isAdmin|isAuthenticated|isSuperUser)\s*[=:]\s*true\b/i,
    severity: "CRITICAL",
    owaspCategory: "A01 Broken Access Control",
  },

  // ── A04 Cryptographic Failures ──────────────────────────────
  {
    name: "Hachage MD5 — algorithme cassé",
    // Détecte : createHash("md5")
    //           → MD5 est cryptographiquement cassé depuis 2004
    regex: /createHash\s*\(\s*['"]md5['"]\s*\)/i,
    severity: "HIGH",
    owaspCategory: "A04 Cryptographic Failures",
  },
  // ... 30+ patterns au total
];
```

#### Filtrage par extension de fichier

Certains patterns ne s'appliquent qu'à certains types de fichiers. Par exemple, `innerHTML` n'a de sens que dans des fichiers web (JS/TS/HTML/Vue), pas dans un fichier Python ou YAML :

```typescript
// Définition des groupes d'extensions
const JS_TS_EXTS = new Set([".js", ".ts", ".jsx", ".tsx", ".mjs"]);
const WEB_EXTS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".html",
  ".vue",
  ".svelte",
]);

// Avant de tester un pattern sur un fichier donné :
const ext = path.extname(filePath).toLowerCase(); // ".ts"
if (pattern.exts && !pattern.exts.has(ext)) continue; // ignore si mauvaise extension
```

---

### Scanner 3 — `src/lib/scanners/fileWalker.ts`

Ce module utilitaire est utilisé par les deux scanners précédents. Il **parcourt récursivement** l'arbre de fichiers du dépôt en ignorant ce qui n'est pas pertinent :

```typescript
const IGNORED_DIRS = new Set([
  "node_modules", // Bibliothèques tierces — des milliers de fichiers inutiles à scanner
  ".git", // Historique git interne
  ".next", // Build Next.js
  "dist",
  "build", // Autres builds
  "coverage", // Rapports de tests
]);

const IGNORED_EXTS = new Set([
  ".jpg",
  ".png",
  ".gif",
  ".mp4", // Fichiers médias — pas de texte à analyser
  ".zip",
  ".exe",
  ".dll", // Binaires
  ".lock", // Lockfiles (trop verbeux, déjà traités par npm audit)
]);

export const MAX_FILE_SIZE = 500_000; // Ignorer les fichiers > 500KB (fichiers bundlés, minifiés…)
```

---

### Scanner 4 — `src/lib/scanners/npmAudit.ts` + `src/lib/parser.ts`

Ce scanner exécute la commande officielle `npm audit --json` sur le dépôt pour détecter les **dépendances vulnérables**. `npm audit` interroge la base de données officielle des CVE (Common Vulnerabilities and Exposures) de npm.

Le résultat est un gros bloc JSON que `src/lib/parser.ts` décompose pour extraire les vulnérabilités au format standard de SecureScan. Le fichier `src/lib/owaspMapper.ts` mappe ensuite chaque vulnérabilité npm vers la catégorie OWASP la plus pertinente.

---

## 8. Étape 4 — Le calcul du score et de la note

### `src/lib/score.ts`

Le système de scoring est volontairement simple et transparent — pas de boîte noire :

```typescript
// Chaque finding "coûte" des points selon sa gravité
const penalites: Record<Severity, number> = {
  CRITICAL: 20, // Une faille critique enlève 20 points
  HIGH: 15, // Une faille élevée enlève 15 points
  MEDIUM: 10, // Une faille moyenne enlève 10 points
  LOW: 5, // Une faille faible enlève 5 points
};

export function computeScore(findings: Vulnerability[]): number {
  let totalPenalites = 0;
  for (const f of findings) {
    totalPenalites += penalites[f.severity] ?? 0; // ?? 0 = fallback si sévérité inconnue
  }
  // On part de 100 et on soustrait. Le score ne peut pas être négatif.
  return Math.max(0, 100 - totalPenalites);
}

export function computeGrade(score: number): Grade {
  if (score >= 90) return "A"; // Excellent  (score ≥ 90)
  if (score >= 75) return "B"; // Bien       (75 ≤ score < 90)
  if (score >= 60) return "C"; // Moyen      (60 ≤ score < 75)
  if (score >= 40) return "D"; // Insuffisant(40 ≤ score < 60)
  return "F"; // Critique   (score < 40)
}
```

**Exemple concret :** Un repo avec 2 failles CRITICAL, 1 HIGH et 3 MEDIUM obtient :

```
100 − (2 × 20) − (1 × 15) − (3 × 10)
= 100 − 40 − 15 − 30
= 15/100 → Grade F
```

---

## 9. Étape 5 — La page de rapport

### `src/app/report/page.tsx`

Cette page est la plus complexe de l'application. Elle lit les données du `sessionStorage`, les affiche, et offre plusieurs actions interactives.

#### Chargement des données au démarrage

```tsx
"use client"; // Obligatoire : sessionStorage n'existe que dans le navigateur

useEffect(() => {
  // useEffect s'exécute une seule fois, juste après le premier affichage de la page
  const raw = sessionStorage.getItem("securescan-report");
  if (!raw) {
    setReady(true); // Pas de données = message "Aucun rapport disponible"
    return;
  }

  const parsed = JSON.parse(raw) as ScanResponse;
  setScan(parsed); // Stocke le rapport dans l'état React → déclenche un ré-affichage

  const savedUrl = sessionStorage.getItem("securescan-url");
  if (savedUrl) setRepoUrl(savedUrl); // Utile pour l'export PDF et la correction IA

  setReady(true);
}, []); // [] = dépendances vides → s'exécute une seule fois
```

#### Affichage des findings

Chaque vulnérabilité est affichée dans une carte colorée selon sa sévérité. Les couleurs sont définies dans `SEVERITY_LABELS` :

```tsx
const SEVERITY_LABELS = {
  CRITICAL: { label: "Critique", tone: "text-red-400", bg: "bg-red-500/15" },
  HIGH: { label: "Élevée", tone: "text-orange-300", bg: "bg-orange-500/15" },
  MEDIUM: { label: "Moyenne", tone: "text-yellow-200", bg: "bg-yellow-500/15" },
  LOW: { label: "Faible", tone: "text-emerald-300", bg: "bg-emerald-500/15" },
};

{
  scan.vulnerabilities.map((vuln, index) => (
    <div
      key={index}
      className={`rounded-lg p-4 ${SEVERITY_LABELS[vuln.severity].bg}`}
    >
      <Badge className={SEVERITY_LABELS[vuln.severity].tone}>
        {SEVERITY_LABELS[vuln.severity].label}
      </Badge>
      <span>{vuln.description}</span>
      <p className="text-sm">
        {vuln.file}
        {vuln.line ? `:${vuln.line}` : ""}
      </p>
      {vuln.branch && <p>Branches : {vuln.branch}</p>}

      {/* Le bouton correction IA n'apparaît que si l'URL du repo est connue */}
      {repoUrl && (
        <Button onClick={() => handleAiFix(index)}>
          <Sparkles /> Corriger via IA
        </Button>
      )}
    </div>
  ));
}
```

#### Les recommandations dynamiques

Au lieu d'afficher des conseils génériques identiques pour tous les repos, la fonction `buildRecommendations` analyse les vraies findings et génère des conseils adaptés à ce qui a été trouvé :

```typescript
function buildRecommendations(vulnerabilities) {
  const seen = new Set<string>(); // Pour éviter les doublons
  const recs: Recommendation[] = [];

  function add(key: string, title: string, detail: string, priority: number) {
    if (!seen.has(key)) {
      // N'ajoute pas si déjà présent
      seen.add(key);
      recs.push({ title, detail, priority });
    }
  }

  for (const v of vulnerabilities) {
    const d = v.description.toLowerCase();

    // SQL trouvé → conseil sur les requêtes paramétrées
    if (d.includes("sql")) {
      add(
        "sql",
        "Utiliser des requêtes paramétrées ou un ORM",
        "Ne jamais concaténer des entrées utilisateur dans une requête SQL. " +
          "Utiliser Prisma, Drizzle, ou pg.query('SELECT * WHERE id = $1', [id]).",
        1, // priorité 1 = urgent
      );
    }

    // isAdmin hardcodé → conseil authentification
    if (d.includes("isadmin")) {
      add(
        "auth-bypass",
        "Supprimer les contournements d'authentification",
        "Ne jamais mettre isAdmin=true en dur. Vérifier les rôles depuis la session ou le JWT.",
        1,
      );
    }

    // MD5 ou SHA-1 → conseil algorithmes modernes
    if (d.includes("md5") || d.includes("sha-1")) {
      add(
        "hash",
        "Remplacer les algorithmes de hachage obsolètes",
        "MD5 et SHA-1 sont cassés. Utiliser SHA-256 pour les checksums, bcrypt/argon2 pour les mots de passe.",
        1,
      );
    }
    // ... 25+ patterns au total
  }

  // Trier par priorité croissante (1 = le plus urgent en premier)
  // et ne garder que les 5 recommandations les plus importantes
  return recs.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
```

---

## 10. Étape 6 — L'export PDF

### `src/lib/pdfExport.ts`

Quand l'utilisateur clique sur "Exporter en PDF", cette fonction s'exécute **entièrement dans le navigateur** — aucune requête serveur. Elle utilise la bibliothèque `jsPDF` pour construire le document page par page.

```typescript
export async function exportToPdf(scan: ScanResponse, repoUrl?: string): Promise<void> {
  // Import dynamique : jsPDF est chargé seulement quand on clique sur le bouton,
  // pas au chargement de la page (optimisation de performance)
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── 1. Bandeau header ────────────────────────────────────────
  doc.setFillColor(15, 15, 15);         // Couleur de fond : noir presque pur
  doc.rect(0, 0, pageW, 28, "F");       // Rectangle rempli sur toute la largeur, 28mm de haut
  doc.setTextColor(255, 255, 255);      // Texte blanc
  doc.setFontSize(16);
  doc.text("SecureScan", 16, 12);       // Le nom de l'outil
  doc.setFontSize(8);
  doc.text(`Généré le ${dateStr}`, pageW - 16, 19, { align: "right" });

  // ── 2. Score et grade ────────────────────────────────────────
  doc.setFontSize(48);
  doc.text(`${scan.score}/100`, ...);   // "73/100" en très grande police

  // ── 3. Tableau des findings ──────────────────────────────────
  autoTable(doc, {
    head: [["Sévérité", "Description", "Fichier", "Ligne", "Branches"]],
    body: scan.vulnerabilities.map((v) => [
      SEVERITY_FR[v.severity],          // "Critique", "Élevée"…
      v.description,                    // "SQL Injection — template literal…"
      v.file,                           // "src/api/users.ts"
      v.line?.toString() ?? "-",        // "42"
      v.branch ?? "-",                  // "main, feature/login"
    ]),
    // Chaque sévérité a sa propre couleur de fond dans la cellule
    didParseCell: (data) => {
      if (data.column.index === 0 && data.section === "body") {
        const sev = data.cell.raw as string;
        const colorMap = { Critique: [220,38,38], Élevée: [234,88,12], ... };
        data.cell.styles.fillColor = colorMap[sev] ?? [100,100,100];
      }
    },
  });

  // ── 4. Téléchargement ────────────────────────────────────────
  // Le navigateur ouvre automatiquement la boîte de dialogue "Enregistrer sous"
  doc.save(`securescan-${repo}-${timestamp}.pdf`);
}
```

---

## 11. Étape 7 — La correction IA avec Gemini

Quand l'utilisateur clique sur "Corriger via IA" sur une finding, deux étapes s'enchaînent.

### Route API `fix-with-ai` — `src/app/api/fix-with-ai/route.ts`

Cette route côté serveur va chercher le fichier vulnérable et l'envoie à Gemini :

```typescript
// POST reçu avec : { repoUrl, filePath, vulnerabilities, branch? }
export async function POST(request: NextRequest) {
  // Sécurité cruciale : vérifier que filePath ne contient pas de "../"
  // Une attaque "path traversal" essaierait filePath = "../../etc/passwd"
  const normalized = path.normalize(filePath).replace(/\\/g, "/");
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return NextResponse.json(
      { error: "Chemin de fichier invalide" },
      { status: 400 },
    );
  }

  // Cloner le repo (avec toutes les branches)
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "securescan-fix-"));
  await execFileAsync(
    "git",
    ["clone", "--no-single-branch", "--depth", "1", cloneUrl, "."],
    {
      cwd: tempDir,
    },
  );

  // Aller sur la branche où la vulnérabilité a été détectée
  // (sans ça, le fichier pourrait ne pas exister si la branche est différente de main)
  if (branch) {
    await execFileAsync("git", ["checkout", branch], { cwd: tempDir });
  }

  // Lire le fichier
  const fileContent = fs.readFileSync(path.join(tempDir, normalized), "utf-8");

  // Envoyer à Gemini pour correction
  const fix = await fixVulnerabilityWithAI(
    fileContent,
    filePath,
    vulnerabilities,
  );

  return NextResponse.json(fix);
  // Réponse : { fixedCode: "...", explanation: "..." }
}
```

### `src/lib/gemini.ts` — Le dialogue avec l'IA

```typescript
export async function fixVulnerabilityWithAI(
  fileContent: string, // Le code source du fichier vulnérable
  filePath: string, // Le chemin du fichier (contexte pour l'IA)
  vulnerabilities: Vulnerability[], // Les failles à corriger
): Promise<AiFixResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // On formate la liste des vulns pour l'inclure dans le prompt
  const vulnList = vulnerabilities
    .map(
      (v, i) =>
        `${i + 1}. [${v.severity}] ${v.description} (ligne ${v.line ?? "?"})`,
    )
    .join("\n");
  // Résultat exemple :
  // "1. [CRITICAL] SQL Injection — template literal non paramétré (ligne 42)
  //  2. [HIGH] Password hardcoded (ligne 15)"

  // Le prompt est très directionnel : on veut un JSON structuré, rien d'autre
  const prompt = `
Tu es un expert en sécurité applicative. Voici un fichier de code avec des vulnérabilités.

**Fichier** : ${filePath}
**Vulnérabilités détectées** :
${vulnList}

**Code source** :
\`\`\`
${fileContent}
\`\`\`

Ta mission :
1. Corriger TOUTES les vulnérabilités listées en modifiant le code minimal nécessaire.
2. Ne pas changer la logique métier, uniquement corriger les failles de sécurité.
3. Répondre UNIQUEMENT au format JSON suivant, sans markdown autour :
{
  "fixedCode": "<code corrigé complet>",
  "explanation": "<explication courte en français, max 3 phrases>"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extraire le JSON de la réponse (Gemini peut parfois ajouter du texte avant/après)
  const jsonMatch = text.match(
    /\{[\s\S]*"fixedCode"[\s\S]*"explanation"[\s\S]*\}/,
  );
  if (!jsonMatch) throw new Error("Réponse Gemini invalide — JSON non trouvé");

  return JSON.parse(jsonMatch[0]) as AiFixResult;
  // Retourne : { fixedCode: "...", explanation: "..." }
}
```

#### Gestion du quota (erreur 429)

L'API Gemini gratuite est limitée. Si le quota est atteint, le code réessaie automatiquement avec un délai qui double à chaque tentative (backoff exponentiel) :

```typescript
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5000; // 5 secondes de base

for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    return await appelGemini(prompt); // Si succès → retour immédiat
  } catch (err) {
    const isQuota =
      message.includes("429") || message.includes("Too Many Requests");

    if (isQuota && attempt < MAX_RETRIES - 1) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      // Tentative 0 → attend 5s  (5000 × 2^0 = 5000ms)
      // Tentative 1 → attend 10s (5000 × 2^1 = 10000ms)
      // Tentative 2 → attend 20s (5000 × 2^2 = 20000ms)
      await sleep(delay);
      continue; // Réessaie
    }

    // Toutes les tentatives épuisées → message d'erreur clair
    if (isQuota) {
      throw new Error("Quota Gemini dépassé. Réessaie dans quelques secondes.");
    }
    throw err; // Autre type d'erreur → remonte normalement
  }
}
```

#### Ce que l'utilisateur voit

Une fois la réponse reçue, une modale s'affiche avec :

- **L'explication Gemini** (fond violet) : ce qui a été changé dans le code et pourquoi
- **Le code corrigé complet** (fond vert sombre) : prêt à copier-coller
- **Le bouton "Créer une PR"** : pour envoyer automatiquement le correctif sur GitHub

---

## 12. Étape 8 — Le bot GitHub et les Pull Requests automatiques

### `src/app/api/create-fix-pr/route.ts`

Simple relais vers la logique dans `githubBot.ts` :

```typescript
// POST reçu avec : { repoUrl, filePath, fix, vulnerabilityDescription, branch? }
const { owner, repo } = parseGitHubUrl(repoUrl);
const result = await createFixPr(
  owner,
  repo,
  filePath,
  fix,
  vulnerabilityDescription,
  branch,
);
return NextResponse.json(result);
// Réponse : { prUrl: "https://github.com/user/repo/pull/42", branchName: "securescan/fix-..." }
```

### `src/lib/githubBot.ts` — L'orchestration complète

Ce fichier pilote toute la séquence via l'API REST GitHub v3, **sans aucune dépendance externe** (pas de bibliothèque Octokit) :

#### Séquence visuelle

```
Repo original : github.com/user/my-project  (branche : main)
         │
         │  Étape 1 : FORK
         ▼
Fork du bot : github.com/securescan-bot/my-project
         │
         │  Étape 2 : CRÉER UNE BRANCHE sur le fork
         ▼
Branche : securescan/fix-src-index-ts-a7f3r
         │
         │  Étape 3 : COMMITTER le fichier corrigé dans cette branche
         ▼
Commit : "fix(security): SQL Injection — template literal…"
         │
         │  Étape 4 : OUVRIR UNE PULL REQUEST
         ▼
PR : github.com/user/my-project ← github.com/securescan-bot/my-project
     (branche cible : main)        (branche source : securescan/fix-...)
```

#### La fonction principale

```typescript
export async function createFixPr(
  originalOwner: string, // "user"
  originalRepo: string, // "my-project"
  filePath: string, // "src/index.ts"
  fix: AiFixResult, // { fixedCode: "...", explanation: "..." }
  vulnerabilityDescription: string,
  targetBranch?: string, // "main" (branche du repo original à cibler)
): Promise<BotPrResult> {
  const token = process.env.GITHUB_BOT_TOKEN;

  // Étape 1 : Forker (ou récupérer le fork existant s'il a déjà été créé)
  const fork = await forkRepo(originalOwner, originalRepo, token);
  const baseBranch = targetBranch ?? fork.defaultBranch; // "main" par défaut

  // Étape 2 : Générer un nom de branche unique et lisible
  const slug = filePath.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40);
  // "src/index.ts" → "src-index-ts"
  const branchName = `securescan/fix-${slug}-${Date.now().toString(36)}`;
  // Exemple : "securescan/fix-src-index-ts-m3k7p2a"
  // Date.now().toString(36) = timestamp en base 36 → court et unique

  const baseSha = await getBranchSha(fork.owner, fork.repo, baseBranch, token);
  await createBranch(fork.owner, fork.repo, branchName, baseSha, token);

  // Étape 3 : Committer le fichier corrigé
  const commitMsg = `fix(security): ${vulnerabilityDescription.slice(0, 72)}`;
  await commitFile(
    fork.owner,
    fork.repo,
    filePath,
    fix.fixedCode,
    branchName,
    commitMsg,
    token,
  );

  // Étape 4 : Créer la PR
  const prBody = `## 🔒 Correction de sécurité — SecureScan

**Fichier concerné :** \`${filePath}\`

### Correction apportée
${fix.explanation}

---
*Cette PR a été générée automatiquement par [SecureScan](https://github.com/Nowalityy/SecureScan)*`;

  const prUrl = await createPullRequest(
    originalOwner,
    originalRepo, // Repo cible (où la PR doit arriver)
    fork.owner,
    branchName, // Repo source + branche (d'où vient le code)
    baseBranch, // Branche cible sur l'original
    commitMsg,
    prBody,
    token,
  );

  return { prUrl, branchName };
  // Exemple : { prUrl: "https://github.com/user/my-project/pull/5", branchName: "securescan/fix-..." }
}
```

#### Comment `commitFile` fonctionne via l'API GitHub

Committer un fichier via l'API GitHub (sans `git push`) se fait en deux appels API :

```typescript
async function commitFile(
  owner,
  repo,
  filePath,
  content,
  branch,
  message,
  token,
) {
  // Appel 1 : récupérer le SHA actuel du fichier
  // L'API GitHub exige ce SHA pour mettre à jour un fichier existant
  // (cela évite les conflits si quelqu'un d'autre a modifié le fichier entre-temps)
  const fileRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
  );
  const existing = await fileRes.json();
  const sha = existing.sha; // undefined si le fichier n'existe pas encore

  // Appel 2 : pousser le fichier
  // Le contenu doit être encodé en base64 (format requis par l'API)
  const contentB64 = Buffer.from(content, "utf-8").toString("base64");

  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message, // Le message du commit
        content: contentB64,
        branch, // La branche sur laquelle committer
        sha, // SHA du fichier actuel (requis pour une mise à jour)
      }),
    },
  );
}
```

---

## 13. Les types TypeScript partagés

### `src/lib/types.ts`

TypeScript oblige à définir explicitement la forme de chaque donnée. Ce fichier contient les types utilisés partout dans l'application — côté serveur pour les scanners, et côté client pour l'affichage.

```typescript
// Les catégories de vulnérabilités selon le Top 10 OWASP
// OWASP = Open Web Application Security Project
// Le Top 10 est la liste des 10 types de failles les plus fréquentes et dangereuses
export type OwaspCategory =
  | "A01 Broken Access Control" // Un utilisateur accède à ce qu'il ne devrait pas voir
  | "A02 Security Misconfiguration" // Mauvaise configuration (CORS trop large, debug activé…)
  | "A03 Injection" // Du code malveillant injecté dans une requête (SQL, shell…)
  | "A04 Cryptographic Failures" // Secrets exposés, algorithmes faibles, mauvaise crypto
  | "A06 Insecure Design"; // La conception elle-même est fondamentalement non sécurisée

// Les niveaux de sévérité, du moins grave au plus grave
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// Une vulnérabilité individuellement détectée
export interface Vulnerability {
  tool: string; // Quel scanner l'a trouvée : "secrets-scanner", "code-scanner", "npm-audit"
  file: string; // Dans quel fichier : "src/api/users.ts"
  line?: number; // À quelle ligne (undefined = pas applicable, ex: dépendances npm)
  description: string; // Ce qui a été trouvé : "SQL Injection — template literal non paramétré"
  severity: Severity; // Sa gravité : "CRITICAL"
  owaspCategory: OwaspCategory; // Sa catégorie OWASP : "A03 Injection"
  branch?: string; // Sur quelle(s) branche(s) : "main, feature/login"
}

// Ce que l'API renvoie après un scan complet
export interface ScanResponse {
  score: number; // 73 (sur 100)
  grade: Grade; // "B"
  totalFindings: number; // 5 (nombre total de vulnérabilités)
  vulnerabilities: Vulnerability[]; // La liste détaillée
}
```

---

## 14. Sécurité intégrée dans le code

SecureScan analyse le code des autres, donc son propre code doit être irréprochable. Voici les protections en place :

### Anti-SSRF (Server-Side Request Forgery)

Une attaque SSRF consiste à forcer le serveur à faire des requêtes vers des hôtes sensibles (ex: `http://169.254.169.254/` sur AWS pour voler les credentials de l'instance).

```typescript
// src/lib/github.ts
const hostname = parsed.hostname.toLowerCase();
if (hostname !== "github.com" && hostname !== "www.github.com") {
  throw new Error(`Domaine non autorisé. Seul github.com est accepté.`);
}
// Seul github.com est autorisé. Impossible de cibler un autre hôte.
```

### Anti-Path Traversal

Une attaque path traversal consiste à sortir du dossier prévu via `../`. Par exemple : `filePath = "../../etc/passwd"` pour lire des fichiers système.

```typescript
// src/app/api/fix-with-ai/route.ts
const normalized = path.normalize(filePath).replace(/\\/g, "/");
// path.normalize("../../etc/passwd") → "../../etc/passwd"
// Après normalize, on vérifie :
if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
  return NextResponse.json(
    { error: "Chemin de fichier invalide" },
    { status: 400 },
  );
}
// Seuls les chemins relatifs à l'intérieur du repo sont acceptés.
```

### Anti-injection shell

```typescript
// DANGEREUX — exec passe par un shell
exec(`git clone ${url}`, callback);
// Si url = "x; rm -rf /", la commande rm s'exécuterait réellement.

// SÉCURISÉ — execFile appelle git directement, sans shell
execFile("git", ["clone", "--depth", "1", url, "."], options);
// Les arguments sont traités comme des données, jamais comme du code.
```

### Zéro stockage garanti

```typescript
// Le bloc finally s'exécute TOUJOURS, même si une exception est levée.
// Même si le scan plante, le dossier temporaire est nettoyé.
try {
  // ... clone, scan ...
} catch (err) {
  // ... gestion des erreurs ...
} finally {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Aucune trace du dépôt ne subsiste sur le serveur.
  }
}
```

---

## 15. Variables d'environnement

Toutes les clés secrètes sont stockées dans `.env.local`, **jamais dans le code source**. Ce fichier est listé dans `.gitignore` et ne sera jamais commité ni exposé.

| Variable           | Usage                                                   | Obligatoire                           |
| ------------------ | ------------------------------------------------------- | ------------------------------------- |
| `GEMINI_API_KEY`   | Correction IA via Google Gemini 2.5 Flash               | Pour la fonctionnalité correction IA  |
| `GITHUB_BOT_TOKEN` | Création de PRs automatiques via le compte bot          | Pour la fonctionnalité PR automatique |
| `GITHUB_TOKEN`     | Augmenter les limites de l'API GitHub (60 → 5000 req/h) | Non                                   |

**Pour obtenir `GEMINI_API_KEY`** : https://aistudio.google.com/apikey (gratuit)

**Pour obtenir `GITHUB_BOT_TOKEN`** :

1. Créer un compte GitHub dédié (ex: `mon-projet-bot`)
2. Aller dans _Settings → Developer settings → Personal access tokens → Tokens (classic)_
3. Cocher le scope `repo`
4. Copier le token dans `.env.local`

---

## 16. Résumé du flux complet

Voici le parcours d'un scan de A jusqu'à Z, en une seule vue :

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. L'utilisateur entre "https://github.com/user/repo"              │
│    dans ScanForm.tsx                                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ fetch POST
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Route /api/scan-from-github/route.ts                            │
│    ├─ parseGitHubUrl() → { owner: "user", repo: "repo" }           │
│    ├─ git clone --no-single-branch --depth 1 → /tmp/securescan-xxx │
│    ├─ git branch -r → ["main", "feature/login"]                    │
│    └─ Pour chaque branche :                                         │
│       ├─ git checkout <branch>                                      │
│       └─ runSecurityScan(tempDir, branch)  ←── orchestrator.ts     │
│             ├─ runSecretsScanner()  → 3 findings                   │
│             ├─ runCodeScanner()     → 2 findings                   │
│             └─ runNpmAudit()        → 0 findings                   │
│          [Promise.allSettled — les 3 tournent en parallèle]        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ 3. Dédoublonnage inter-branches                                     │
│    "SQL Injection" vue sur main ET feature → branch = "main, feat" │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ 4. score.ts : computeScore([...findings]) → 73                     │
│              computeGrade(73) → "B"                                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ JSON : { score:73, grade:"B", ... }
┌───────────────────────────────▼─────────────────────────────────────┐
│ 5. ScanForm.tsx stocke dans sessionStorage → router.push("/report") │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ 6. report/page.tsx lit sessionStorage + affiche :                   │
│    • Score 73/100 + Grade B                                         │
│    • Compteurs : CRITICAL:1  HIGH:2  MEDIUM:2  LOW:0               │
│    • Liste findings colorés + filtrable                             │
│    • Recommandations dynamiques (buildRecommendations)              │
│    • Bouton "Exporter en PDF" → pdfExport.ts (dans le navigateur)  │
│    • Bouton "Corriger via IA" sur chaque finding                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Clic sur "Corriger via IA"
┌───────────────────────────────▼─────────────────────────────────────┐
│ 7. Route /api/fix-with-ai/route.ts                                 │
│    ├─ Sécurité : valide que filePath ne contient pas "../"          │
│    ├─ git clone --no-single-branch → /tmp/securescan-fix-xxx        │
│    ├─ git checkout <branch> (branche où la faille a été trouvée)   │
│    ├─ fs.readFileSync(filePath) → code source du fichier            │
│    └─ fixVulnerabilityWithAI(code, path, vulns) → gemini.ts        │
│         └─ gemini-2.5-flash génère { fixedCode, explanation }      │
│         └─ retry automatique si erreur 429 (quota)                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ Modale affichée
                                │ Clic sur "Créer une PR"
┌───────────────────────────────▼─────────────────────────────────────┐
│ 8. Route /api/create-fix-pr/route.ts → githubBot.ts                │
│    ├─ forkRepo()          → github.com/securescan-bot/repo         │
│    ├─ getBranchSha()      → SHA du dernier commit sur "main"        │
│    ├─ createBranch()      → "securescan/fix-src-index-ts-a7f3r"    │
│    ├─ commitFile()        → commit du fichier corrigé (API GitHub)  │
│    └─ createPullRequest() → PR : fork → original                   │
│         → prUrl = "https://github.com/user/repo/pull/5"            │
└─────────────────────────────────────────────────────────────────────┘
```

---

_SecureScan — Construit avec Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, jsPDF 4, et Google Gemini 2.5 Flash._
