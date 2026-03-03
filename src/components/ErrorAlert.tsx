"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Affiché lorsqu'une erreur doit être montrée à l'utilisateur puis redirection vers l'accueil.
export default function ErrorAlert({ message }: { message: string }) {
  const router = useRouter();

  useEffect(() => {
    alert(`Erreur SecureScan :\n\n${message}`);
    router.push("/");
  }, [message, router]);

  return null;
}
