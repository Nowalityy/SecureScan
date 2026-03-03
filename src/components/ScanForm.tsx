"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Redirige vers /report?url=...&branch=... → déclenche le fetch côté serveur
export default function ScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    const trimmedBranch = branch.trim() || "main";

    if (!trimmed) {
      alert("Veuillez entrer une URL GitHub.");
      return;
    }

    if (trimmed.length > 500) {
      alert("URL trop longue. Veuillez entrer une URL GitHub valide.");
      return;
    }

    // Validation basique avant d'envoyer au serveur
    try {
      const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const parsed = new URL(withScheme);
      const hostname = parsed.hostname.toLowerCase();
      if (hostname !== "github.com" && hostname !== "www.github.com") {
        const safeHostname = hostname.slice(0, 64);
        alert(`URL invalide.\n\nSeules les URLs github.com sont acceptées.\nReçu : ${safeHostname}`);
        return;
      }
      const parts = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/").filter(Boolean);
      if (parts.length < 2) {
        alert("URL incomplète.\n\nFormat attendu : https://github.com/owner/repo");
        return;
      }
    } catch {
      alert("URL invalide.\n\nFormat attendu : https://github.com/owner/repo");
      return;
    }

    router.push(`/report?url=${encodeURIComponent(trimmed)}&branch=${encodeURIComponent(trimmedBranch)}`);
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
      />
      <Input
        type="text"
        placeholder="Branche (ex : main)"
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
        className="h-12 w-full border-white/10 bg-black/40 text-white placeholder:text-white/40 md:w-40"
      />
      <Button type="submit" className="h-12 bg-red-500 text-white hover:bg-red-400">
        Scanner le repo
      </Button>
    </form>
  );
}
