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

type TimeSlot = {
  time: string;
  bands: {
    [stage: string]: Band & { comparison: "both" | "me" | "friend" | "none" };
  };
};

export default function ComparePage({ params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<number>(1);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

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
      buildTimeSlots(compData);
    } catch (error) {
      console.error("Error fetching comparison:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildTimeSlots = (compData: ComparisonData) => {
    // Fetch all bands to build the grid
    fetch("/api/bands")
      .then((res) => res.json())
      .then((allBands: Band[]) => {
        const slots: { [key: string]: TimeSlot } = {};

        allBands.forEach((band) => {
          const timeKey = new Date(band.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

          if (!slots[timeKey]) {
            slots[timeKey] = { time: timeKey, bands: {} };
          }

          // Determine comparison status
          let comparison: "both" | "me" | "friend" | "none" = "none";
          if (compData.both.some((b) => b.id === band.id)) {
            comparison = "both";
          } else if (compData.onlyMe.some((b) => b.id === band.id)) {
            comparison = "me";
          } else if (compData.onlyFriend.some((b) => b.id === band.id)) {
            comparison = "friend";
          }

          slots[timeKey].bands[band.stage] = { ...band, comparison };
        });

        const sortedSlots = Object.values(slots).sort((a, b) => {
          const [aHour, aMin] = a.time.split(":").map(Number);
          const [bHour, bMin] = b.time.split(":").map(Number);
          return aHour * 60 + aMin - (bHour * 60 + bMin);
        });

        setTimeSlots(sortedSlots);
      });
  };

  const getComparisonStyle = (comparison: "both" | "me" | "friend" | "none", colors: any) => {
    switch (comparison) {
      case "both":
        return {
          backgroundColor: `${colors.accent}90`,
          border: "2px solid rgba(34, 197, 94, 0.5)", // green
          glow: "shadow-lg shadow-green-500/30",
          textColor: "text-white drop-shadow-md",
          icon: "🎸",
          label: "Ambos",
          labelColor: "bg-green-500/20 text-green-400 border-green-500/30",
        };
      case "me":
        return {
          backgroundColor: `${colors.accent}70`,
          border: "2px solid rgba(59, 130, 246, 0.4)", // blue
          glow: "shadow-md shadow-blue-500/20",
          textColor: "text-white",
          icon: "👤",
          label: "Solo vos",
          labelColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        };
      case "friend":
        return {
          backgroundColor: `${colors.accent}70`,
          border: "2px solid rgba(245, 158, 11, 0.4)", // amber
          glow: "shadow-md shadow-amber-500/20",
          textColor: "text-white",
          icon: "👥",
          label: `Solo @${data?.friend.username}`,
          labelColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        };
      case "none":
      default:
        return {
          backgroundColor: `${colors.accent}10`,
          border: `1px solid ${colors.accent}15`,
          glow: "",
          textColor: "text-zinc-500",
          icon: "",
          label: "",
          labelColor: "",
        };
    }
  };

  const filteredTimeSlots = timeSlots.filter((slot) => {
    // Filter by day
    const firstBand = Object.values(slot.bands)[0];
    return firstBand ? firstBand.day === activeDay : false;
  });

  const stages =
    activeDay === 1
      ? ["NORTE", "SUR", "MONTANA", "BOOM_ERANG", "CASITA_BLUES", "PLAZA_ELECTRONICA", "SORPRESA"]
      : ["NORTE", "SUR", "MONTANA", "PARAGUAY", "CASITA_BLUES", "PLAZA_ELECTRONICA", "SORPRESA"];

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
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 flex-shrink-0 z-20">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">Comparación</h1>
              <p className="text-xs text-zinc-400">Vos vs @{data.friend.username}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-green-400">{data.both.length}</div>
              <div className="text-[9px] text-green-300">Ambos</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-blue-400">{data.onlyMe.length}</div>
              <div className="text-[9px] text-blue-300">Solo vos</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
              <div className="text-xl font-bold text-amber-400">{data.onlyFriend.length}</div>
              <div className="text-[9px] text-amber-300">Solo @{data.friend.username}</div>
            </div>
          </div>

          {/* Day selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveDay(1)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeDay === 1
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sabado 14
            </button>
            <button
              onClick={() => setActiveDay(2)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeDay === 2
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Domingo 15
            </button>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="flex min-w-full">
          {/* Time column */}
          <div className="sticky left-0 z-10 flex-shrink-0 bg-zinc-950 w-14">
            <div className="h-10 border-b border-zinc-800/50 flex items-center justify-center sticky top-0 z-20 bg-zinc-950">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Hora</span>
            </div>
            {filteredTimeSlots.map((slot) => (
              <div key={slot.time} className="h-[56px] border-b border-zinc-700/50 flex items-center justify-center bg-zinc-950">
                <span className="text-xs font-bold tabular-nums text-zinc-300">{slot.time}</span>
              </div>
            ))}
          </div>

          {/* Stage columns */}
          {stages.map((stage) => {
            const colors = stageColors[stage];
            if (!colors) {
              console.error(`Stage "${stage}" not found in stageColors`);
              return null;
            }
            return (
              <div key={stage} className="flex-1 min-w-[120px] border-r border-zinc-700/40">
                {/* Stage header */}
                <div className={`h-10 border-b border-zinc-800/50 flex items-center justify-center px-1 bg-gradient-to-r ${colors.gradient} sticky top-0 z-10`}>
                  <span className="text-[10px] font-bold text-white text-center drop-shadow-sm leading-tight">
                    {stageName[stage] || stage}
                  </span>
                </div>

                {/* Bands */}
                {filteredTimeSlots.map((slot) => {
                  const band = slot.bands[stage];
                  if (!colors) return null;

                  if (!band) {
                    return (
                      <div
                        key={`${stage}-${slot.time}`}
                        className="h-[56px] border-b border-zinc-700/50"
                        style={{ backgroundColor: `${colors.accent}08` }}
                      />
                    );
                  }

                  const style = getComparisonStyle(band.comparison, colors);

                  return (
                    <div
                      key={`${stage}-${slot.time}`}
                      className="h-[56px] border-b border-zinc-700/50 p-0.5"
                      style={{ backgroundColor: `${colors.accent}10` }}
                    >
                      <div
                        className={`h-full rounded-xl flex flex-col justify-center relative overflow-hidden transition-all duration-200 ${style.glow}`}
                        style={{
                          padding: "5px 7px",
                          backgroundColor: style.backgroundColor,
                          border: style.border,
                        }}
                      >
                        {/* Band name */}
                        <div className="flex-1 min-h-0 flex items-center">
                          <h3 className={`text-sm font-bold leading-tight line-clamp-2 text-center w-full ${style.textColor}`}>
                            {band.name}
                          </h3>
                        </div>

                        {/* Comparison indicator */}
                        {band.comparison !== "none" && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <span className="text-xs">{style.icon}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${style.labelColor}`}>
                              {style.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
