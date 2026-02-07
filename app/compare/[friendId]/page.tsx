"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { stageColors, stageName } from "@/lib/stage-colors";

type Band = {
  id: string;
  name: string;
  day: number;
  stage: string;
  startTime: string;
  endTime: string;
};

type ComparisonData = {
  friend: { username: string; avatar: string };
  both: Band[];
  onlyMe: Band[];
  onlyFriend: Band[];
};

export default function ComparePage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchComparison();
    }
  }, [status, friendId]);

  const fetchComparison = async () => {
    try {
      const res = await fetch(`/api/compare/${friendId}`);
      const compData = await res.json();
      setData(compData);
    } catch (error) {
      console.error("Error fetching comparison:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderBandList = (bands: Band[], title: string, color: string, icon: string) => {
    if (bands.length === 0) return null;

    const day1 = bands.filter((b) => b.day === 1).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const day2 = bands.filter((b) => b.day === 2).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{icon}</span>
          <h2 className={`text-lg font-bold ${color}`}>{title}</h2>
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{bands.length}</span>
        </div>

        {day1.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">Viernes 14</h3>
            <div className="space-y-2">
              {day1.map((band) => {
                const colors = stageColors[band.stage];
                const time = new Date(band.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <motion.div
                    key={band.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50"
                  >
                    <div className="w-1 h-12 rounded-full" style={{ backgroundColor: colors.accent }} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-sm">{band.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${colors.accent}25`, color: colors.accent }}>
                          {stageName[band.stage]}
                        </span>
                        <span className="text-[10px] text-zinc-500">{time}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {day2.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-2">Sábado 15</h3>
            <div className="space-y-2">
              {day2.map((band) => {
                const colors = stageColors[band.stage];
                const time = new Date(band.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <motion.div
                    key={band.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2.5 bg-zinc-900/50 rounded-lg border border-zinc-800/50"
                  >
                    <div className="w-1 h-12 rounded-full" style={{ backgroundColor: colors.accent }} />
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-sm">{band.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${colors.accent}25`, color: colors.accent }}>
                          {stageName[band.stage]}
                        </span>
                        <span className="text-[10px] text-zinc-500">{time}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading || !data) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Comparando agendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Comparación de Agendas</h1>
            <p className="text-xs text-zinc-400">Tú vs @{data.friend.username}</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{data.both.length}</div>
          <div className="text-[10px] text-green-300 mt-1">En común</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{data.onlyMe.length}</div>
          <div className="text-[10px] text-blue-300 mt-1">Solo tú</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{data.onlyFriend.length}</div>
          <div className="text-[10px] text-amber-300 mt-1">Solo @{data.friend.username}</div>
        </div>
      </div>

      {/* Lists */}
      <div className="p-4">
        {renderBandList(data.both, "Bandas en común", "text-green-400", "🎸")}
        {renderBandList(data.onlyMe, "Solo vos", "text-blue-400", "👤")}
        {renderBandList(data.onlyFriend, `Solo @${data.friend.username}`, "text-amber-400", "👥")}

        {data.both.length === 0 && data.onlyMe.length === 0 && data.onlyFriend.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-zinc-400">Ninguno de los dos tiene bandas seleccionadas aún</p>
          </div>
        )}
      </div>
    </div>
  );
}
