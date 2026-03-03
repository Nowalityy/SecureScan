"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Affiché par le Server Component report/page.tsx quand fetchRepoContent échoue.
// Fait un alert() côté client puis renvoie sur la landing.
export default function ErrorAlert({ message }: { message: string }) {
  const router = useRouter();

  useEffect(() => {
    alert(`Erreur SecureScan :\n\n${message}`);
    router.push("/");
  }, [message, router]);

  return null;
}
