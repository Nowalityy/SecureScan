"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_GITHUB_URL_LENGTH } from "@/lib/constants";

// Clé utilisée pour stocker le rapport en sessionStorage (page report)
const REPORT_KEY = "securescan-report";

export default function ScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      alert("Veuillez entrer une URL GitHub.");
      return;
    }
    if (trimmed.length > MAX_GITHUB_URL_LENGTH) {
      alert(`URL trop longue (max ${MAX_GITHUB_URL_LENGTH} caractères).`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan-from-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || data.details || "Erreur lors du scan");
        return;
      }
      // Stocker le rapport et l'URL pour la page /report (lecture depuis sessionStorage)
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(REPORT_KEY, JSON.stringify(data));
        sessionStorage.setItem("securescan-url", trimmed);
      }
      router.push("/report");
    } catch {
      alert("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center"
    >
      <Input
        type="url"
        placeholder="https://github.com/orga/projet"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="h-12 border-white/10 bg-black/40 text-white placeholder:text-white/40"
        required
        disabled={loading}
      />
      <Button
        type="submit"
        disabled={loading}
        className="h-12 bg-red-500 text-white hover:bg-red-400"
      >
        {loading ? "Scan en cours…" : "Scanner le repo"}
      </Button>
    </form>
  );
}
