"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { use } from "react";

export default function JoinGroupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      // Usuario autenticado, intentar unirse al grupo
      joinGroup();
    } else if (status === "unauthenticated") {
      // Redirigir a login con el código guardado
      localStorage.setItem("pendingGroupCode", code);
      router.push("/login");
    }
  }, [status, code]);

  const joinGroup = async () => {
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.toUpperCase() }),
      });

      if (res.ok) {
        // Éxito - ir a grupos
        router.push("/groups");
      } else {
        const error = await res.json();
        alert(error.error || "Error al unirse al grupo");
        router.push("/groups");
      }
    } catch (error) {
      console.error("Error:", error);
      router.push("/groups");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-pulse text-4xl mb-4">🎸</div>
        <p className="text-text-secondary">Uniéndote al grupo...</p>
      </div>
    </div>
  );
}
