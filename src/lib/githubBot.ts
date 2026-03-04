import type { AiFixResult } from "@/lib/gemini";

const GITHUB_API = "https://api.github.com";

interface ForkInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
}

interface RepoInfo {
  default_branch: string;
  fork: boolean;
  parent?: { full_name: string };
}

// Récupère les infos du repo original
async function getRepoInfo(owner: string, repo: string, token: string): Promise<RepoInfo> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`Repo introuvable: ${owner}/${repo}`);
  return res.json() as Promise<RepoInfo>;
}

// Fork le repo (ou récupère le fork existant)
async function forkRepo(owner: string, repo: string, token: string): Promise<ForkInfo> {
  // Récupère le nom d'utilisateur du bot
  const meRes = await fetch(`${GITHUB_API}/user`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!meRes.ok) throw new Error("Token GitHub invalide");
  const me = await meRes.json() as { login: string };
  const botLogin = me.login;

  // Vérifie si le fork existe déjà
  const checkRes = await fetch(`${GITHUB_API}/repos/${botLogin}/${repo}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });

  let defaultBranch: string;
  if (checkRes.ok) {
    const existing = await checkRes.json() as RepoInfo;
    defaultBranch = existing.default_branch;
  } else {
    // Crée le fork
    const forkRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/forks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ default_branch_only: false }),
    });
    if (!forkRes.ok) {
      const err = await forkRes.json() as { message?: string };
      throw new Error(`Fork échoué: ${err.message ?? forkRes.status}`);
    }
    // Attendre que le fork soit prêt
    await new Promise((r) => setTimeout(r, 4000));
    const repoInfo = await getRepoInfo(owner, repo, token);
    defaultBranch = repoInfo.default_branch;
  }

  return { owner: botLogin, repo, defaultBranch };
}

// Récupère le SHA du dernier commit sur une branche
async function getBranchSha(owner: string, repo: string, branch: string, token: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`Branche ${branch} introuvable sur le fork`);
  const data = await res.json() as { object: { sha: string } };
  return data.object.sha;
}

// Crée une branche sur le fork
async function createBranch(
  owner: string, repo: string, branchName: string, fromSha: string, token: string
): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: fromSha }),
  });
  if (!res.ok) {
    const err = await res.json() as { message?: string };
    // Ignorer si la branche existe déjà
    if (!String(err.message).includes("already exists")) {
      throw new Error(`Création de branche échouée: ${err.message ?? res.status}`);
    }
  }
}

// Récupère le SHA du fichier existant (pour l'update)
async function getFileSha(
  owner: string, repo: string, filePath: string, branch: string, token: string
): Promise<string | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) return null;
  const data = await res.json() as { sha: string };
  return data.sha;
}

// Commite le fichier corrigé sur le fork
async function commitFile(
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  branch: string,
  message: string,
  token: string
): Promise<void> {
  const fileSha = await getFileSha(owner, repo, filePath, branch, token);
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };
  if (fileSha) body.sha = fileSha;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(`Commit échoué: ${err.message ?? res.status}`);
  }
}

// Ouvre une Pull Request depuis le fork vers le repo original
async function createPullRequest(
  originalOwner: string,
  originalRepo: string,
  forkOwner: string,
  forkBranch: string,
  baseBranch: string,
  title: string,
  body: string,
  token: string
): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${originalOwner}/${originalRepo}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body,
      head: `${forkOwner}:${forkBranch}`,
      base: baseBranch,
      maintainer_can_modify: true,
    }),
  });
  if (!res.ok) {
    const err = await res.json() as { message?: string; errors?: { message: string }[] };
    const detail = err.errors?.[0]?.message ?? err.message ?? String(res.status);
    throw new Error(`PR échouée: ${detail}`);
  }
  const pr = await res.json() as { html_url: string };
  return pr.html_url;
}

// ── Point d'entrée principal ───────────────────────────────────────────────

export interface BotPrResult {
  prUrl: string;
  branchName: string;
}

export async function createFixPr(
  originalOwner: string,
  originalRepo: string,
  filePath: string,
  fix: AiFixResult,
  vulnerabilityDescription: string,
  targetBranch?: string
): Promise<BotPrResult> {
  const token = process.env.GITHUB_BOT_TOKEN;
  if (!token) throw new Error("GITHUB_BOT_TOKEN non configuré");

  // 1. Fork
  const fork = await forkRepo(originalOwner, originalRepo, token);
  const baseBranch = targetBranch ?? fork.defaultBranch;

  // 2. Branche fix
  const slug = filePath.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
  const branchName = `securescan/fix-${slug}-${Date.now().toString(36)}`;
  const baseSha = await getBranchSha(fork.owner, fork.repo, baseBranch, token);
  await createBranch(fork.owner, fork.repo, branchName, baseSha, token);

  // 3. Commit
  const commitMsg = `fix(security): ${vulnerabilityDescription.slice(0, 72)}`;
  await commitFile(fork.owner, fork.repo, filePath, fix.fixedCode, branchName, commitMsg, token);

  // 4. PR
  const prBody = `## 🔒 Correction de sécurité — SecureScan

**Fichier concerné :** \`${filePath}\`

### Vulnérabilité
${vulnerabilityDescription}

### Correction apportée
${fix.explanation}

---
*Cette PR a été générée automatiquement par [SecureScan](https://github.com/Nowalityy/SecureScan).*`;

  const prUrl = await createPullRequest(
    originalOwner,
    originalRepo,
    fork.owner,
    branchName,
    baseBranch,
    `fix(security): ${vulnerabilityDescription.slice(0, 60)}`,
    prBody,
    token
  );

  return { prUrl, branchName };
}
