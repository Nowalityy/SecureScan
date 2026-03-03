"use client";

import { useEffect, useState } from "react";
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
import type { ScanResponse } from "@/lib/types";

const REPORT_KEY = "securescan-report";

const SEVERITY_LABELS: Record<string, { label: string; tone: string; bg: string }> = {
  CRITICAL: { label: "Critique", tone: "text-red-400", bg: "bg-red-500/15" },
  HIGH: { label: "Elevee", tone: "text-orange-300", bg: "bg-orange-500/15" },
  MEDIUM: { label: "Moyenne", tone: "text-yellow-200", bg: "bg-yellow-500/15" },
  LOW: { label: "Faible", tone: "text-emerald-300", bg: "bg-emerald-500/15" },
};

const recommendations = [
  { title: "Regenerer les secrets et utiliser un vault", detail: "Remplacer les valeurs hardcodees par des variables d'environnement." },
  { title: "Ajouter une couche de validation", detail: "Introduire un schema Zod pour normaliser les inputs API." },
  { title: "Mettre a jour les dependances critiques", detail: "Planifier un upgrade Axios + audit via npm audit." },
];

function severityIcon(severity: string) {
  if (severity === "CRITICAL" || severity === "HIGH") return TriangleAlert;
  if (severity === "MEDIUM") return AlertTriangle;
  return CheckCircle2;
}

export default function ReportPage() {
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? sessionStorage.getItem(REPORT_KEY) : null;
      if (raw) {
        const data = JSON.parse(raw) as ScanResponse;
        if (data && typeof data.score === "number" && Array.isArray(data.vulnerabilities)) {
          setScan(data);
        }
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

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

  const topFindings = scan.vulnerabilities.map((v, i) => ({
    title: v.owaspCategory,
    severity: SEVERITY_LABELS[v.severity]?.label ?? v.severity,
    file: v.file,
    detail: v.description,
    branch: v.branch,
    icon: severityIcon(v.severity),
    tone: SEVERITY_LABELS[v.severity]?.tone ?? "text-white/70",
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
            <Badge className="bg-white/10 text-white hover:bg-white/10">Rapport de scan</Badge>
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
                    <finding.icon className={`mt-1 h-5 w-5 ${finding.tone}`} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
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
                {recommendations.map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
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
              <h2 className="text-2xl font-semibold text-white">Plan d&apos;action recommande</h2>
              <p className="mt-2 text-sm text-white/60">Priorisation pour passer du scan a l&apos;amelioration.</p>
            </div>
            <Button asChild className="bg-red-500 text-white hover:bg-red-400">
              <Link href="/">Nouveau scan</Link>
            </Button>
          </div>
          <Separator className="my-8 bg-white/10" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">24h</p>
              <p className="mt-2 text-lg font-semibold">Rotation secrets</p>
              <p className="mt-2 text-sm text-white/60">Revoquer les tokens exposes et activer un vault.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">7j</p>
              <p className="mt-2 text-lg font-semibold">Hardening applicatif</p>
              <p className="mt-2 text-sm text-white/60">CSP + headers + validation des inputs.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">30j</p>
              <p className="mt-2 text-lg font-semibold">Suivi continu</p>
              <p className="mt-2 text-sm text-white/60">Scans hebdo et seuils d&apos;alerte.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
