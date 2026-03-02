import {
  Bug,
  CheckCircle2,
  GitBranch,
  Lock,
  Radar,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    title: "Top 5 OWASP",
    description:
      "Scan ciblé sur les 5 failles les plus critiques du Top 10 OWASP pour un signal fort, sans bruit.",
    icon: Radar,
  },
  {
    title: "Score SecureScan",
    description:
      "Un score clair, devenu la référence interne pour mesurer la sécurité d’un repo en un coup d’œil.",
    icon: Bug,
  },
  {
    title: "Zéro stockage",
    description:
      "Aucune donnée n’est sauvegardée. Le scan analyse puis supprime immédiatement.",
    icon: ShieldCheck,
  },
];

const stats = [
  {
    label: "Repos analysés",
    value: "12 482",
    detail: "Depuis le lancement",
  },
  {
    label: "Failles détectées",
    value: "31 907",
    detail: "Toutes sévérités",
  },
  {
    label: "Temps moyen",
    value: "2m 14s",
    detail: "Par scan",
  },
  {
    label: "Score moyen",
    value: "78/100",
    detail: "Top 5 OWASP",
  },
];

const steps = [
  {
    title: "Collez un lien GitHub",
    description: "Public ou privé (avec token bientôt).",
    icon: GitBranch,
  },
  {
    title: "Scan intelligent",
    description: "Analyse multi-langages et corrélation des alertes.",
    icon: Zap,
  },
  {
    title: "Rapport instantané",
    description: "Vue claire des vulnérabilités et des quick wins.",
    icon: Lock,
  },
];

const findings = [
  {
    severity: "Critique",
    title: "Hardcoded secret",
    file: "src/config/auth.ts",
    detail: "Jeton API exposé dans le dépôt.",
    icon: TriangleAlert,
    tone: "text-red-400",
  },
  {
    severity: "Élevée",
    title: "Dépendance vulnérable",
    file: "package.json",
    detail: "Axios < 1.6.2 impacté par SSRF.",
    icon: TriangleAlert,
    tone: "text-orange-300",
  },
  {
    severity: "Faible",
    title: "Headers manquants",
    file: "next.config.ts",
    detail: "CSP non définie.",
    icon: CheckCircle2,
    tone: "text-emerald-300",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_55%)]" />
      <div className="pointer-events-none absolute -top-40 right-0 h-80 w-80 rounded-full bg-red-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-red-500/10 blur-[160px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-20 pt-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
              <Radar className="h-5 w-5 text-red-400" />
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              SecureScan
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            <Button className="bg-red-500 text-white hover:bg-red-400">
              Lancer un scan
            </Button>
          </div>
        </header>

        <section className="mt-16 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-6">
            <Badge className="w-fit bg-white/10 text-white hover:bg-white/10">
              MVP • Scan GitHub en 1 clic
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Détectez les failles dans vos repos GitHub, avant qu&apos;elles ne
              deviennent des incidents.
            </h1>
            <p className="text-base leading-7 text-white/70 md:text-lg">
              SecureScan analyse le Top 5 des failles OWASP, sans conserver vos
              données. C’est rapide, simple et moderne, avec un rapport prêt à
              l’action en quelques minutes.
            </p>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center">
              <Input
                placeholder="https://github.com/orga/projet"
                className="h-12 border-white/10 bg-black/40 text-white placeholder:text-white/40"
              />
              <Button asChild className="h-12 bg-red-500 text-white hover:bg-red-400">
                <Link href="/report">Scanner le repo</Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-red-400" />
                Top 5 OWASP inclus
              </span>
              <span className="inline-flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-400" />
                Rapide, simple, moderne
              </span>
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-400" />
                Zéro donnée sauvegardée
              </span>
            </div>
          </div>

          <Card className="border-white/10 bg-white/5 text-white shadow-2xl shadow-red-500/10">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Rapport de sécurité (exemple)
              </CardTitle>
              <p className="text-sm text-white/60">
                Données simulées pour un aperçu réaliste.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {findings.map((finding) => (
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
        </section>

        <section className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="border-white/10 bg-white/5 text-white"
            >
              <CardHeader className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {stat.label}
                </p>
                <CardTitle className="text-3xl text-white">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-white/60">
                {stat.detail}
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-20 grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-white/10 bg-white/5 text-white"
            >
              <CardHeader className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30">
                  <feature.icon className="h-5 w-5 text-red-400" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-white/70">
                {feature.description}
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-20 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-black/30 p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Comment ça marche
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Un flux ultra simple, pour aller à l&apos;essentiel.
              </p>
            </div>
          </div>
          <Separator className="my-8 bg-white/10" />
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40">
                  <step.icon className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-white/60">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Badge className="w-fit bg-red-500/15 text-red-200 hover:bg-red-500/20">
              Référence SecureScan
            </Badge>
            <h2 className="text-2xl font-semibold text-white">
              Le Score SecureScan est la référence interne.
            </h2>
            <p className="text-sm text-white/70">
              En un chiffre, vous comparez vos repos et suivez l’évolution des
              risques. Simple, rapide, et exploitable immédiatement.
            </p>
            <div className="space-y-3 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-red-400" />
                Score global par repo
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-red-400" />
                Comparaison instantanée entre projets
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-red-400" />
                Focus sur le Top 5 OWASP
              </div>
            </div>
          </div>
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Snapshot du score</CardTitle>
              <p className="text-sm text-white/60">
                Vision claire du score de sécurité.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">
                    Score SecureScan
                  </span>
                  <span className="text-2xl font-semibold text-red-400">
                    81
                  </span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-[81%] rounded-full bg-red-500" />
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/60">
                  <span>Indice de confiance</span>
                  <span className="text-white/80">96%</span>
                </div>
              </div>
              <Button className="w-full bg-red-500 text-white hover:bg-red-400">
                Générer un rapport complet
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-20 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-black/40 to-black/60 p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="w-fit bg-white/10 text-white hover:bg-white/10">
                Premium &amp; Entreprise
              </Badge>
              <h2 className="mt-4 text-2xl font-semibold text-white">
                Passez au niveau supérieur pour industrialiser vos scans.
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Des offres conçues pour les équipes qui veulent aller plus vite
                et traiter plus de risques.
              </p>
            </div>
            <Button className="bg-red-500 text-white hover:bg-red-400">
              Demander une démo
            </Button>
          </div>
          <Separator className="my-8 bg-white/10" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader className="space-y-2">
                <Badge className="w-fit bg-white/10 text-white/80 hover:bg-white/10">
                  Premium
                </Badge>
                <CardTitle className="text-xl">
                  Pour les équipes produit
                </CardTitle>
                <p className="text-sm text-white/60">
                  Plus de scans, plus d’automatisations, plus de vitesse.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/70">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  200 scans / jour + priorité sur la file d’analyse
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  IA de remédiation pour proposer des corrections automatiques
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  Scheduler hebdo + notifications Slack
                </div>
                <Button className="w-full bg-white/10 text-white hover:bg-white/20">
                  Voir le plan Premium
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5 text-white">
              <CardHeader className="space-y-2">
                <Badge className="w-fit bg-red-500/15 text-red-200 hover:bg-red-500/20">
                  Entreprise
                </Badge>
                <CardTitle className="text-xl">
                  Pour les organisations à grande échelle
                </CardTitle>
                <p className="text-sm text-white/60">
                  Gouvernance, sécurité avancée et support dédié.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/70">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  Scans illimités + politiques de sécurité custom
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  Remédiation assistée par IA + PR auto-générées
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  Dashboard multi-projets, SSO, et SLA 24/7
                </div>
                <Button className="w-full bg-red-500 text-white hover:bg-red-400">
                  Contacter l’équipe
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="mt-20 flex flex-col gap-6 border-t border-white/10 pt-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">
              <Radar className="h-4 w-4 text-red-400" />
            </div>
            <span>SecureScan © 2026</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>Balthazar</span>
            <span>Grégory</span>
            <span>Nikolas</span>
            <span>Raphael</span>
            <span>Kokoutse Joel</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
