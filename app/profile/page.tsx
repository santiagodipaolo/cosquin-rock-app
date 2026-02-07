"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 flex-shrink-0">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Perfil</h1>
            <button onClick={() => router.push("/schedule")} className="text-zinc-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto min-h-0 pb-16">
        <div className="p-4">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 mb-6"
          >
            <div className="text-center">
              <div
                className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
                style={{ backgroundColor: session?.user?.image || "#FF6B35" }}
              >
                🎸
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">
                @{session?.user?.name}
              </h2>
              <p className="text-zinc-500 text-sm">
                {session?.user?.email || "Usuario de Cosquin Rock"}
              </p>
            </div>
          </motion.div>

          {/* About */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <Image src="/CR2026.png" alt="CR2026" width={60} height={30} />
              <div>
                <h3 className="font-semibold text-white">Cosquin Rock 2026</h3>
                <p className="text-sm text-zinc-500">14-15 Febrero</p>
              </div>
            </div>
            <p className="text-sm text-zinc-500">
              Coordina tu agenda del festival con amigos
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <button
              onClick={() => router.push("/my-bands")}
              className="w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors text-left flex items-center justify-between"
            >
              <span className="font-medium text-zinc-200">Mi Agenda</span>
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => router.push("/groups")}
              className="w-full py-3 px-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors text-left flex items-center justify-between"
            >
              <span className="font-medium text-zinc-200">Mis Grupos</span>
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors font-medium"
            >
              Cerrar Sesion
            </button>
          </motion.div>

          <div className="mt-8 text-center text-xs text-zinc-600">
            <p>Hecho con amor por Dipa</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 px-4 py-2 z-20">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <button onClick={() => router.push("/schedule")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="text-[10px]">Grilla</span>
          </button>
          <button onClick={() => router.push("/my-bands")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-[10px]">Mi Agenda</span>
          </button>
          <button onClick={() => router.push("/groups")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[10px]">Grupos</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-semibold">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
