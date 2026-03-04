import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Vulnerability } from "@/lib/types";

export interface AiFixResult {
  fixedCode: string;
  explanation: string;
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 5000; // 5s, 10s, 20s

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fixVulnerabilityWithAI(
  fileContent: string,
  filePath: string,
  vulnerabilities: Vulnerability[]
): Promise<AiFixResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurée");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const vulnList = vulnerabilities
    .map(
      (v, i) =>
        `${i + 1}. [${v.severity}] ${v.description} (ligne ${v.line ?? "?"}) — ${v.owaspCategory}`
    )
    .join("\n");

  const prompt = `Tu es un expert en sécurité applicative. Voici un fichier de code avec des vulnérabilités détectées.

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
  "fixedCode": "<code corrigé complet, avec toutes les modifications>",
  "explanation": "<explication courte en français des corrections apportées, max 3 phrases>"
}`;

  let lastError: Error = new Error("Erreur inconnue");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*"fixedCode"[\s\S]*"explanation"[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Réponse Gemini invalide — JSON non trouvé");

      const parsed = JSON.parse(jsonMatch[0]) as AiFixResult;
      if (!parsed.fixedCode || !parsed.explanation) {
        throw new Error("Réponse Gemini incomplète");
      }

      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(message);

      const isQuota = message.includes("429") || message.includes("quota") || message.includes("Too Many Requests");
      if (isQuota && attempt < MAX_RETRIES - 1) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(`[gemini] 429 — retry ${attempt + 1}/${MAX_RETRIES - 1} dans ${delay / 1000}s`);
        await sleep(delay);
        continue;
      }

      if (isQuota) {
        throw new Error("Quota Gemini dépassé. Le tier gratuit est limité à 15 requêtes/min. Réessaie dans quelques secondes.");
      }
      throw lastError;
    }
  }

  throw lastError;
}
