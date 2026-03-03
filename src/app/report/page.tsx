import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  GitBranch,
  Lock,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchRepoContent } from "@/lib/github";
import ErrorAlert from "@/components/ErrorAlert";

const reportMeta = {
  repo: "github.com/secureorg/scan-demo",
  branch: "main",
  scanDate: "2026-03-02",
  duration: "2m 07s",
  score: 81,
  confidence: 96,
};

const severitySummary = [
  { label: "Critique", value: 2, tone: "text-red-400", bg: "bg-red-500/15" },
  { label: "Elevee", value: 5, tone: "text-orange-300", bg: "bg-orange-500/15" },
  { label: "Moyenne", value: 9, tone: "text-yellow-200", bg: "bg-yellow-500/15" },
  { label: "Faible", value: 14, tone: "text-emerald-300", bg: "bg-emerald-500/15" },
];

const topFindings = [
  {
    title: "Hardcoded secret",
    severity: "Critique",
    file: "src/config/auth.ts",
    detail: "Token API expose dans le depot.",
    icon: TriangleAlert,
    tone: "text-red-400",
  },
  {
    title: "Injection SQL potentielle",
    severity: "Elevee",
    file: "src/api/search.ts",
    detail: "Requete concatenee sans sanitization.",
    icon: AlertTriangle,
    tone: "text-orange-300",
  },
  {
    title: "Dependance vulnerable",
    severity: "Elevee",
    file: "package.json",
    detail: "Axios < 1.6.2 impacte par SSRF.",
    icon: AlertTriangle,
    tone: "text-orange-300",
  },
  {
    title: "Headers manquants",
    severity: "Faible",
    file: "next.config.ts",
    detail: "CSP non definie.",
    icon: CheckCircle2,
    tone: "text-emerald-300",
  },
];

const recommendations = [
  {
    title: "Regenerer les secrets et utiliser un vault",
    detail: "Remplacer les valeurs hardcodees par des variables d'environnement.",
  },
  {
    title: "Ajouter une couche de validation",
    detail: "Introduire un schema Zod pour normaliser les inputs API.",
  },
  {
    title: "Mettre a jour les dependances critiques",
    detail: "Planifier un upgrade Axios + audit via npm audit.",
  },
];

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; branch?: string }>;
}) {
  const { url, branch } = await searchParams;

  // Rejet d’une URL absente ou trop longue avant tout traitement
  if (!url) {
    return <ErrorAlert message="Aucune URL fournie.\n\nFormat attendu : https://github.com/owner/repo" />;
  }
  if (url.length > 500) {
    return <ErrorAlert message="URL trop longue." />;
  }

  try {
    const data = await fetchRepoContent(url, branch || "main");
    // Affichage dans le terminal serveur — sera remplacé par du vrai traitement
    console.log("[SecureScan] repo fetch OK:", data.repo.full_name);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("[SecureScan] Erreur fetch:", message);
    return <ErrorAlert message={message} />;
  }

  return (
    <div className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.16),_transparent_60%)]" />
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-red-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-red-500/10 blur-[160px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-20 pt-10">
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
            <Badge className="bg-white/10 text-white hover:bg-white/10">
              Rapport de scan
            </Badge>
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
                {reportMeta.repo}
                <span className="text-white/40">•</span>
                {reportMeta.branch}
              </div>
              <CardTitle className="text-2xl">
                Rapport de securite (demo)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Date du scan
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {reportMeta.scanDate}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Duree
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {reportMeta.duration}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Moteur
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  SecureScan Core v0.4
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Couverture
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Top 5 OWASP + Secrets
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Score SecureScan</CardTitle>
              <p className="text-sm text-white/60">
                Indicateur global, base sur la severite et la confiance.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Score</span>
                  <span className="text-3xl font-semibold text-red-400">
                    {reportMeta.score}
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-red-500"
                    style={{ width: `${reportMeta.score}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/60">
                  <span>Confiance</span>
                  <span className="text-white/80">
                    {reportMeta.confidence}%
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-3 text-sm text-white/60">
                  <Lock className="h-4 w-4 text-red-300" />
                  Aucune donnee n'est stockee apres le scan.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {severitySummary.map((item) => (
            <Card
              key={item.label}
              className="border-white/10 bg-white/5 text-white"
            >
              <CardHeader className="space-y-2">
                <Badge className={`${item.bg} ${item.tone} border border-white/10`}>
                  {item.label}
                </Badge>
                <CardTitle className="text-3xl text-white">
                  {item.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-white/60">
                Elements detectes
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">
                Principales vulnerabilites
              </CardTitle>
              <p className="text-sm text-white/60">
                Focus sur les alertes a traiter en priorite.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {topFindings.map((finding) => (
                <div
                  key={finding.title}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4"
                >
                  <finding.icon className={`mt-1 h-5 w-5 ${finding.tone}`} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">
                        {finding.title}
                      </span>
                      <Badge
                        className="border border-white/10 bg-white/5 text-xs text-white/70"
                        variant="secondary"
                      >
                        {finding.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/60">{finding.file}</p>
                    <p className="text-sm text-white/70">{finding.detail}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Resume rapide</CardTitle>
                <p className="text-sm text-white/60">
                  Prochaine etape recommandee.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/70">
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 h-4 w-4 text-red-300" />
                  <span>
                    4 fichiers critiques touches. 3 secrets exposes detectes.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-4 w-4 text-red-300" />
                  <span>
                    Couverture acceptable, mais manque de headers de securite.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-300" />
                  <span>
                    62% des alertes sont resolvables en moins d'une journee.
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-lg">Recommandations</CardTitle>
                <p className="text-sm text-white/60">
                  Actions prioritaires pour reduire le risque.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendations.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-black/30 p-4"
                  >
                    <p className="text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-white/60">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/30 p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Plan d'action recommande
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Priorisation rapide pour passer du scan a l'amelioration.
              </p>
            </div>
            <Button className="bg-red-500 text-white hover:bg-red-400">
              Exporter en PDF
            </Button>
          </div>
          <Separator className="my-8 bg-white/10" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                24h
              </p>
              <p className="mt-2 text-lg font-semibold">Rotation secrets</p>
              <p className="mt-2 text-sm text-white/60">
                Revoquer les tokens exposes et activer un vault.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                7j
              </p>
              <p className="mt-2 text-lg font-semibold">Hardening applicatif</p>
              <p className="mt-2 text-sm text-white/60">
                CSP + headers + validation renforcee des inputs.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                30j
              </p>
              <p className="mt-2 text-lg font-semibold">Suivi continu</p>
              <p className="mt-2 text-sm text-white/60">
                Activer les scans hebdo et seuils d'alerte.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
