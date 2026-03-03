import type {
  GitHubRepo,
  GitHubTree,
  GitHubTreeItem,
  GitHubFileContent,
  RepoFile,
  RepoData,
} from "@/types/github";

const GITHUB_API = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // optionnel — 60 req/h sans, 5000 avec
const MAX_FILE_SIZE_BYTES = 1_000_000;
const MAX_FILES_TO_FETCH = 500; // anti-DoS
const MAX_URL_LENGTH = 500;    // anti-DoS sur l'URL en entrée

// Extensions binaires et lockfiles à ne pas récupérer
const IGNORED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".bmp", ".tiff", ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".pdf", ".exe", ".dll", ".so", ".dylib",
  ".mp4", ".mp3", ".avi", ".mov", ".wav",
  ".pyc", ".pyo", ".class", ".lock",
]);

const IGNORED_FILENAMES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "composer.lock", "Gemfile.lock", "poetry.lock", "Cargo.lock",
]);

// Dossiers à ignorer entièrement
const IGNORED_DIRS = [
  "node_modules/", ".git/", "dist/", "build/", ".next/", ".nuxt/",
  "out/", "coverage/", ".cache/", "vendor/", "__pycache__/",
  ".venv/", "venv/", ".mypy_cache/", ".pytest_cache/",
  "target/", "bin/", "obj/", ".gradle/",
];

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  return headers;
}

// Validation par regex — mêmes contraintes que GitHub
const OWNER_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const REPO_REGEX  = /^[a-zA-Z0-9._-]{1,100}$/;

/**
 * Parse et valide une URL GitHub.
 * - Anti-SSRF : whitelist github.com uniquement
 * - Anti-injection : owner et repo validés par regex
 */
export function parseGitHubUrl(rawUrl: string): { owner: string; repo: string } {
  const trimmed = rawUrl.trim();

  // Anti-DoS : URL trop longue
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new Error(`URL trop longue (max ${MAX_URL_LENGTH} caractères).`);
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    // On ne ré-écrit pas rawUrl dans l'erreur (peut être très long)
    throw new Error("URL invalide. Format attendu : https://github.com/owner/repo");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    // Tronquer le hostname dans le message pour ne pas réfléchir du contenu arbitraire
    const safeHostname = hostname.slice(0, 64);
    throw new Error(`Domaine non autorisé : "${safeHostname}". Seul github.com est accepté.`);
  }

  const parts = parsed.pathname
    .replace(/^\//, "")
    .replace(/\.git$/, "")
    .split("/")
    .filter(Boolean);

  const owner = parts[0];
  const repo  = parts[1];

  if (!owner || !repo) {
    throw new Error("URL GitHub invalide. Format attendu : https://github.com/owner/repo");
  }
  if (!OWNER_REGEX.test(owner)) throw new Error(`Nom d'utilisateur GitHub invalide.`);
  if (!REPO_REGEX.test(repo))   throw new Error(`Nom de repo GitHub invalide.`);

  return { owner, repo };
}

// Métadonnées du repo — donne la branche par défaut
export async function fetchRepoInfo(owner: string, repo: string): Promise<GitHubRepo> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: buildHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Repo introuvable : ${owner}/${repo}\n\nLe repo n'existe pas ou est privé (les repos privés ne sont pas supportés).`);
    if (res.status === 403 || res.status === 429) throw new Error("Limite de l'API GitHub atteinte. Ajoutez un GITHUB_TOKEN dans .env.local.");
    throw new Error(`Erreur GitHub API : ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<GitHubRepo>;
}

// Arborescence complète en un seul appel grâce à ?recursive=1
export async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<GitHubTree> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: buildHeaders(), cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Impossible de récupérer l'arborescence : ${res.status}`);
  const tree: GitHubTree = await res.json();
  if (tree.truncated) console.warn(`[github] Arborescence tronquée pour ${owner}/${repo}`);
  return tree;
}

// Contenu d'un fichier — GitHub le renvoie en base64, on décode en UTF-8
export async function fetchFileContent(owner: string, repo: string, path: string): Promise<string | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: buildHeaders(), cache: "no-store" }
  );
  if (!res.ok) {
    if (res.status === 429 || res.status === 403) {
      throw new Error("Limite de l'API GitHub atteinte. Ajoutez un GITHUB_TOKEN dans .env.local.");
    }
    console.warn(`[github] Impossible de lire "${path}" : ${res.status}`);
    return null;
  }
  const data: GitHubFileContent = await res.json();
  if (data.encoding !== "base64") return null;

  // try/catch au cas où GitHub renvoie une chaîne base64 corrompue
  try {
    return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
  } catch {
    console.warn(`[github] Décodage base64 échoué pour "${path}"`);
    return null;
  }
}

function shouldFetchFile(item: GitHubTreeItem): boolean {
  if (item.type !== "blob") return false;
  if (IGNORED_DIRS.some((dir) => item.path.startsWith(dir) || item.path.includes("/" + dir))) return false;
  const filename = item.path.split("/").pop() ?? "";
  if (IGNORED_FILENAMES.has(filename)) return false;
  const ext = "." + (item.path.split(".").pop() ?? "");
  if (IGNORED_EXTENSIONS.has(ext.toLowerCase())) return false;
  if (item.size !== undefined && item.size > MAX_FILE_SIZE_BYTES) return false;
  return true;
}

// Point d'entrée principal : URL GitHub → { repo, files, tree }
export async function fetchRepoContent(githubUrl: string, branch?: string): Promise<RepoData> {
  const { owner, repo } = parseGitHubUrl(githubUrl);
  const repoInfo = await fetchRepoInfo(owner, repo);
  const targetBranch = branch?.trim() || repoInfo.default_branch;
  const { tree } = await fetchRepoTree(owner, repo, targetBranch);

  // Filtrer l'arborescence (node_modules, binaires, lockfiles...)
  const filteredTree = tree.filter((item) => {
    if (IGNORED_DIRS.some((dir) => item.path.startsWith(dir) || item.path.includes("/" + dir))) return false;
    const filename = item.path.split("/").pop() ?? "";
    if (IGNORED_FILENAMES.has(filename)) return false;
    return true;
  });

  // Limiter à MAX_FILES_TO_FETCH fichiers (anti-DoS)
  const filesToFetch = filteredTree.filter(shouldFetchFile).slice(0, MAX_FILES_TO_FETCH);

  // Récupérer les contenus par batches de 10 en parallèle
  const files: RepoFile[] = [];
  const CONCURRENCY = 10;
  for (let i = 0; i < filesToFetch.length; i += CONCURRENCY) {
    const results = await Promise.all(
      filesToFetch.slice(i, i + CONCURRENCY).map(async (item) => {
        const content = await fetchFileContent(owner, repo, item.path);
        if (content === null) return null;
        return { path: item.path, content, size: item.size ?? 0 } satisfies RepoFile;
      })
    );
    files.push(...(results.filter(Boolean) as RepoFile[]));
  }

  return { repo: repoInfo, files, tree: filteredTree };
}
