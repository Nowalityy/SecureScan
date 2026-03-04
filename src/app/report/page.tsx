"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { exportToPdf } from "@/lib/pdfExport";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  GitBranch,
  Lock,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScanResponse } from "@/lib/types";

const REPORT_KEY = "securescan-report";

const SEVERITY_LABELS: Record<string, { label: string; tone: string; bg: string }> = {
  CRITICAL: { label: "Critique", tone: "text-red-400", bg: "bg-red-500/15" },
  HIGH: { label: "Elevee", tone: "text-orange-300", bg: "bg-orange-500/15" },
  MEDIUM: { label: "Moyenne", tone: "text-yellow-200", bg: "bg-yellow-500/15" },
  LOW: { label: "Faible", tone: "text-emerald-300", bg: "bg-emerald-500/15" },
};

interface Recommendation {
  title: string;
  detail: string;
  priority: number; // plus bas = plus prioritaire
}

function buildRecommendations(vulnerabilities: ScanResponse["vulnerabilities"]): Recommendation[] {
  const seen = new Set<string>();
  const recs: Recommendation[] = [];

  function add(key: string, title: string, detail: string, priority: number) {
    if (!seen.has(key)) {
      seen.add(key);
      recs.push({ title, detail, priority });
    }
  }

  for (const v of vulnerabilities) {
    const d = v.description.toLowerCase();
    const cat = v.owaspCategory;

    // ── A04 Cryptographic Failures ──
    if (d.includes("md5") || d.includes("sha-1")) {
      add("hash", "Remplacer les algorithmes de hachage obsolètes", "MD5 et SHA-1 sont cryptographiquement cassés. Utiliser SHA-256 ou bcrypt/argon2 pour les mots de passe.", 1);
    }
    if (d.includes("aes-ecb")) {
      add("aes", "Passer en mode AES-GCM ou AES-CBC avec IV aléatoire", "Le mode ECB est déterministe et expose des patterns dans les données chiffrées.", 1);
    }
    if (d.includes("clé cryptographique") || d.includes("hardcoded") && cat === "A04 Cryptographic Failures") {
      add("hardkey", "Sortir les clés cryptographiques du code source", "Utiliser des variables d'environnement ou un secret manager (Vault, AWS Secrets Manager).", 1);
    }
    if (d.includes("math.random")) {
      add("random", "Utiliser crypto.randomBytes() pour les tokens de sécurité", "Math.random() n'est pas cryptographiquement sûr.", 2);
    }
    if (d.includes("base64") && d.includes("prévisible")) {
      add("b64token", "Générer des tokens avec une entropie suffisante", "Buffer.from(...).toString('base64') sans source aléatoire produit des tokens prévisibles. Utiliser crypto.randomBytes(32).", 2);
    }

    // ── A01 Broken Access Control ──
    if (d.includes("idor") || d.includes("params")) {
      add("idor", "Vérifier que l'utilisateur est propriétaire de la ressource", "Toujours valider que req.user.id === ressource.userId avant de retourner des données.", 1);
    }
    if (d.includes("isadmin") || d.includes("isauthenticated")) {
      add("auth-bypass", "Supprimer les contournements d'authentification hardcodés", "Ne jamais fixer isAdmin=true en dur. Vérifier les rôles depuis la session ou le JWT.", 1);
    }
    if (d.includes("credentials") && d.includes("réponse")) {
      add("creds-leak", "Ne jamais exposer des credentials dans une réponse API", "Retirer les mots de passe, tokens et clés des réponses JSON. Logger uniquement des identifiants opaques.", 1);
    }

    // ── A02 Security Misconfiguration ──
    if (d.includes("cors")) {
      add("cors", "Restreindre CORS aux origines autorisées", "Remplacer Access-Control-Allow-Origin: * par une liste blanche explicite.", 2);
    }
    if (d.includes("process.env") && d.includes("exposition")) {
      add("env-leak", "Ne jamais exposer process.env complet", "N'exposer que les variables explicitement nécessaires. Jamais d'objet env entier dans une réponse.", 1);
    }
    if (d.includes("ssl") || d.includes("tls") || d.includes("rejectunauthorized")) {
      add("ssl", "Réactiver la vérification des certificats SSL/TLS", "rejectUnauthorized: false expose aux attaques MITM. À n'utiliser que localement.", 2);
    }
    if (d.includes("debug")) {
      add("debug", "Désactiver le mode debug en production", "Les informations de debug peuvent exposer des stacktraces et des données internes.", 3);
    }
    if (d.includes("http") && !d.includes("https")) {
      add("http", "Forcer HTTPS sur toutes les connexions", "Les URLs HTTP transmettent les données en clair. Utiliser HTTPS partout.", 3);
    }

    // ── A03 Injection ──
    if (d.includes("sql")) {
      add("sql", "Utiliser des requêtes paramétrées ou un ORM", "Ne jamais construire des requêtes SQL par concaténation. Utiliser Prisma, Drizzle ou pg.query($1, [val]).", 1);
    }
    if (d.includes("eval")) {
      add("eval", "Supprimer tous les appels à eval()", "eval() exécute du code arbitraire. Remplacer par des alternatives sûres (JSON.parse, Function avec sandbox).", 1);
    }
    if (d.includes("exec") || d.includes("spawn") || d.includes("shell")) {
      add("shell", "Valider et échapper les entrées avant toute exécution shell", "Utiliser execFile() avec des arguments séparés plutôt que exec() avec une chaîne concaténée.", 1);
    }
    if (d.includes("innerhtml") || d.includes("document.write") || d.includes("xss")) {
      add("xss", "Échapper les données avant insertion dans le DOM", "Utiliser textContent au lieu de innerHTML. En React, éviter dangerouslySetInnerHTML.", 2);
    }

    // ── A03 Supply Chain ──
    if (cat === "A03 Software Supply Chain Failures") {
      add("deps", "Mettre à jour les dépendances vulnérables", "Lancer npm audit fix ou mettre à jour manuellement les packages signalés.", 2);
    }

    // ── A06 Insecure Design ──
    if (d.includes("todo") || d.includes("fixme")) {
      add("todo", "Résoudre les TODO/FIXME de sécurité", "Les commentaires de sécurité non résolus indiquent des failles connues non corrigées.", 3);
    }
    if (d.includes("console.log")) {
      add("console", "Retirer les console.log de données sensibles", "Les logs en production peuvent être capturés. Utiliser un logger structuré avec niveaux configurables.", 3);
    }
  }

  // Tri par priorité, max 5 recommandations
  return recs.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

function severityIcon(severity: string) {
  if (severity === "CRITICAL" || severity === "HIGH") return TriangleAlert;
  if (severity === "MEDIUM") return AlertTriangle;
  return CheckCircle2;
}

export default function ReportPage() {
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | undefined>(undefined);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [aiLoadingIndex, setAiLoadingIndex] = useState<number | null>(null);
  const [aiModal, setAiModal] = useState<{ fixedCode: string; explanation: string; filePath: string; vulnDescription: string; branch?: string } | null>(null);
  const [prLoading, setPrLoading] = useState(false);
  const [prUrl, setPrUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(REPORT_KEY) : null;
      if (raw) {
        const data = JSON.parse(raw) as ScanResponse;
        if (data && typeof data.score === "number" && Array.isArray(data.vulnerabilities)) {
          setScan(data);
        }
      }
      const url = typeof window !== "undefined" ? sessionStorage.getItem("securescan-url") ?? undefined : undefined;
      setRepoUrl(url);
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  async function handleAiFix(index: number) {
    if (!scan || !repoUrl) return;
    const vuln = scan.vulnerabilities[index];
    setAiLoadingIndex(index);
    try {
      const res = await fetch("/api/fix-with-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          filePath: vuln.file,
          branch: vuln.branch?.split(", ")[0], // prend la première branche si plusieurs
          vulnerabilities: [vuln],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur IA");
      setAiModal({ fixedCode: data.fixedCode, explanation: data.explanation, filePath: vuln.file, vulnDescription: vuln.description, branch: vuln.branch?.split(", ")[0] });
      setPrUrl(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur lors de la correction IA");
    } finally {
      setAiLoadingIndex(null);
    }
  }

  async function handleCreatePr() {
    if (!aiModal || !repoUrl) return;
    setPrLoading(true);
    try {
      const res = await fetch("/api/create-fix-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          filePath: aiModal.filePath,
          branch: aiModal.branch,
          fix: { fixedCode: aiModal.fixedCode, explanation: aiModal.explanation },
          vulnerabilityDescription: aiModal.vulnDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur PR");
      setPrUrl(data.prUrl);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur lors de la création de la PR");
    } finally {
      setPrLoading(false);
    }
  }

  async function handleExportPdf() {
    if (!scan) return;
    setPdfLoading(true);
    try {
      await exportToPdf(scan, repoUrl);
    } catch (e) {
      console.error("PDF export error:", e);
    } finally {
      setPdfLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-white/60">Chargement…</p>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
        <p className="text-center text-white/80">Aucun rapport de scan.</p>
        <p className="text-center text-sm text-white/50">Lancez un scan depuis l&apos;accueil.</p>
        <Button asChild className="bg-red-500 text-white hover:bg-red-400">
          <Link href="/">Accueil</Link>
        </Button>
      </div>
    );
  }

  const severitySummary = (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => {
    const value = scan.vulnerabilities.filter((v) => v.severity === s).length;
    const { label, tone, bg } = SEVERITY_LABELS[s];
    return { label, value, tone, bg };
  });

  const recommendations = buildRecommendations(scan.vulnerabilities);

  const topFindings = scan.vulnerabilities.map((v, i) => ({
    title: v.owaspCategory,
    severity: SEVERITY_LABELS[v.severity]?.label ?? v.severity,
    file: v.file,
    detail: v.description,
    branch: v.branch,
    icon: severityIcon(v.severity),
    tone: SEVERITY_LABELS[v.severity]?.tone ?? "text-white/70",
    index: i,
  }));

  return (
    <div className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.16),_transparent_60%)]" />
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-red-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-red-500/10 blur-[160px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-20 pt-10 animate-in fade-in duration-300">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <ShieldCheck className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              SecureScan
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/60">
            <Button asChild className="bg-red-500 text-white hover:bg-red-400">
              <Link href="/">Nouveau scan</Link>
            </Button>
          </div>
        </header>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <GitBranch className="h-4 w-4 text-red-300" />
                Rapport de securite
              </div>
              <CardTitle className="text-2xl">Rapport de securite</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Score</p>
                <p className="mt-2 text-lg font-semibold text-white">{scan.score} / 100</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Alertes</p>
                <p className="mt-2 text-lg font-semibold text-white">{scan.totalFindings}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Moteur</p>
                <p className="mt-2 text-lg font-semibold text-white">SecureScan Core</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Couverture</p>
                <p className="mt-2 text-lg font-semibold text-white">Top 5 OWASP + Secrets</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Score SecureScan</CardTitle>
              <p className="text-sm text-white/60">Indicateur global.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Score</span>
                  <span className="text-3xl font-semibold text-red-400">{scan.score}</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-red-500"
                    style={{ width: `${Math.min(100, scan.score)}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/60">
                  <span>Grade</span>
                  <span className="text-white/80">{scan.grade}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <Lock className="h-4 w-4 text-red-300" />
                  Aucune donnee n&apos;est stockee apres le scan.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {severitySummary.map((item) => (
            <Card key={item.label} className="border-white/10 bg-white/5 text-white">
              <CardHeader className="space-y-2">
                <Badge className={`${item.bg} ${item.tone} border border-white/10`}>{item.label}</Badge>
                <CardTitle className="text-3xl text-white">{item.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-white/60">Elements detectes</CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Vulnerabilites</CardTitle>
              <p className="text-sm text-white/60">
                Alertes detectees par Semgrep, npm audit et TruffleHog.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {topFindings.length === 0 ? (
                <p className="text-sm text-white/60">Aucune vulnerabilite detectee.</p>
              ) : (
                topFindings.map((finding, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4"
                  >
                    <finding.icon className={`mt-1 h-5 w-5 shrink-0 ${finding.tone}`} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{finding.title}</span>
                        <Badge
                          className="border border-white/10 bg-white/5 text-xs text-white/70"
                          variant="secondary"
                        >
                          {finding.severity}
                        </Badge>
                        {finding.branch && (
                          <Badge className="border border-white/10 bg-white/5 text-xs text-white/50" variant="secondary">
                            {finding.branch}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-white/60">{finding.file}</p>
                      <p className="text-sm text-white/70">{finding.detail}</p>
                      {repoUrl && (
                        <button
                          onClick={() => handleAiFix(finding.index)}
                          disabled={aiLoadingIndex === finding.index}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                          {aiLoadingIndex === finding.index ? "Correction en cours…" : "Corriger via IA"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Resume rapide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/70">
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-4 w-4 text-red-300" />
                  <span>{scan.totalFindings} alerte(s) detectee(s).</span>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 text-red-300" />
                  <span>Score SecureScan : {scan.score} / 100 (grade {scan.grade}).</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-300" />
                  <span>Top 5 OWASP + secrets (TruffleHog).</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Recommandations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendations.length === 0 ? (
                  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <p className="text-sm text-white/70">Aucune recommandation — aucune faille détectée.</p>
                  </div>
                ) : (
                  recommendations.map((item) => (
                    <div key={item.title} className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-white/60">{item.detail}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Export PDF</CardTitle>
                <p className="text-sm text-white/60">Telecharger le rapport complet.</p>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={pdfLoading}
                  className="cursor-pointer bg-white/10 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  <span>{pdfLoading ? "Génération…" : "Exporter en PDF"}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

      </div>

      {/* Modale correction IA */}
      {aiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold text-white">Correction IA</span>
                <span className="text-xs text-white/40">{aiModal.filePath}</span>
              </div>
              <button
                onClick={() => setAiModal(null)}
                className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-300">Explication</p>
                <p className="text-sm text-white/80">{aiModal.explanation}</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/40">Code corrigé</p>
                <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 text-xs text-green-300 whitespace-pre-wrap">{aiModal.fixedCode}</pre>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                {prUrl ? (
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300 transition hover:bg-violet-500/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Voir la PR ouverte
                  </a>
                ) : repoUrl ? (
                  <button
                    onClick={handleCreatePr}
                    disabled={prLoading}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {prLoading ? "Création de la PR…" : "Créer une PR"}
                  </button>
                ) : null}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aiModal.fixedCode);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
              >
                Copier le code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
