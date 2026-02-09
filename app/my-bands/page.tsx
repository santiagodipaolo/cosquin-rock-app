"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { stageColors, stageName, stageEmoji } from "@/lib/stage-colors";

type FriendInfo = {
  username: string;
  source: "group" | "friend";
};

type MyBand = {
  id: string;
  band: {
    id: string;
    name: string;
    day: number;
    stage: string;
    startTime: string;
    endTime: string;
  };
  friendsGoing?: number;
  friendsList?: string[];
  friendsInfo?: FriendInfo[];
};

export default function MyBandsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bands, setBands] = useState<MyBand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<1 | 2>(1);
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const nowLineRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isBandPast = useCallback((band: { endTime: string }) => {
    return new Date(band.endTime).getTime() < now;
  }, [now]);

  const isBandCurrent = useCallback((band: { startTime: string; endTime: string }) => {
    const start = new Date(band.startTime).getTime();
    const end = new Date(band.endTime).getTime();
    return now >= start && now < end;
  }, [now]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchMyBands();
    }
  }, [status, router]);

  // Scroll to "now" indicator after loading
  useEffect(() => {
    if (!loading && nowLineRef.current) {
      setTimeout(() => {
        nowLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, [loading, selectedDay]);

  const fetchMyBands = async () => {
    try {
      const res = await fetch("/api/attendance");
      const data = await res.json();

      const enriched = await Promise.all(
        data.map(async (item: MyBand) => {
          const friendsRes = await fetch(`/api/attendance?bandId=${item.band.id}`);
          const friendsData = await friendsRes.json();
          return {
            ...item,
            friendsGoing: friendsData.length,
            friendsList: friendsData.map((f: any) => f.user.username),
            friendsInfo: friendsData.map((f: any) => ({
              username: f.user.username,
              source: f.source || "group",
            })),
          };
        })
      );
      setBands(enriched);
    } catch (error) {
      console.error("Error fetching bands:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeBand = async (bandId: string) => {
    setBands((prev) => prev.filter((b) => b.band.id !== bandId));
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bandId, attending: false }),
      });
    } catch (error) {
      console.error("Error removing band:", error);
      fetchMyBands();
    }
  };

  const [linkCopied, setLinkCopied] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "both" }),
      });
      if (res.ok) {
        const data = await res.json();
        await navigator.clipboard.writeText(data.url);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    } finally {
      setSharing(false);
    }
  };


  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  const dayBands = bands
    .filter((b) => b.band.day === selectedDay)
    .sort((a, b) => new Date(a.band.startTime).getTime() - new Date(b.band.startTime).getTime());
  const day1Count = bands.filter((b) => b.band.day === 1).length;
  const day2Count = bands.filter((b) => b.band.day === 2).length;

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 flex-shrink-0 z-10">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Mi Agenda</h1>
              <p className="text-xs text-zinc-500">
                {bands.length} {bands.length === 1 ? "banda" : "bandas"} en total
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                disabled={sharing || bands.length === 0}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
                  linkCopied
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                }`}
              >
                {linkCopied ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )}
                {sharing ? "..." : linkCopied ? "Link copiado!" : "Compartir"}
              </button>
            </div>
          </div>

          {/* Day toggle */}
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl">
            <button
              onClick={() => setSelectedDay(1)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedDay === 1
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sabado 14
              {day1Count > 0 && (
                <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{day1Count}</span>
              )}
            </button>
            <button
              onClick={() => setSelectedDay(2)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedDay === 2
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Domingo 15
              {day2Count > 0 && (
                <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{day2Count}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 pb-16">
        {loading ? (
          <div className="p-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-zinc-400 text-sm">Cargando...</span>
          </div>
        ) : bands.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="text-6xl mb-4">🎸</div>
            <h2 className="text-lg font-bold text-white mb-2">Arma tu agenda</h2>
            <p className="text-zinc-400 text-sm text-center mb-6">
              Anda a la grilla y toca las bandas que quieras ver para agregarlas aca
            </p>
            <button
              onClick={() => router.push("/schedule")}
              className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Ir a la grilla
            </button>
          </div>
        ) : dayBands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-zinc-400 text-sm text-center">No tenes bandas marcadas para este dia</p>
            <button
              onClick={() => router.push("/schedule")}
              className="mt-4 px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
            >
              Explorar grilla
            </button>
          </div>
        ) : (
          <div className="p-4">
            {/* Timeline view */}
            <div className="space-y-1">
              {dayBands.map((item, index) => {
                const colors = stageColors[item.band.stage] || stageColors.NORTE;
                const time = new Date(item.band.startTime).toLocaleTimeString("es-AR", {
                  hour: "2-digit", minute: "2-digit",
                });
                const endTime = item.band.endTime ? new Date(item.band.endTime).toLocaleTimeString("es-AR", {
                  hour: "2-digit", minute: "2-digit",
                }) : null;

                const isPast = isBandPast(item.band);
                const isCurrent = isBandCurrent(item.band);

                // Check if this is the first non-past band (to place "now" line)
                const isFirstUpcoming = !isPast && !isCurrent && (index === 0 || isBandPast(dayBands[index - 1].band) || isBandCurrent(dayBands[index - 1].band));

                // Check if time changed from previous band
                const prevTime = index > 0 ? new Date(dayBands[index - 1].band.startTime).toLocaleTimeString("es-AR", {
                  hour: "2-digit", minute: "2-digit",
                }) : null;
                const showTimeHeader = time !== prevTime;

                return (
                  <div key={item.id}>
                    {/* Now line indicator - shown before first upcoming band */}
                    {isFirstUpcoming && (
                      <div ref={nowLineRef} className="flex items-center gap-2 py-2 my-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50 flex-shrink-0" />
                        <div className="flex-1 h-[2px] bg-red-500 shadow-sm shadow-red-500/50" />
                        <span className="text-[10px] font-bold text-red-400 flex-shrink-0">AHORA</span>
                      </div>
                    )}

                    {/* Time separator */}
                    {showTimeHeader && (
                      <div className="flex items-center gap-3 py-3 mt-2 first:mt-0">
                        <div className={`text-base font-bold tabular-nums ${isPast ? "text-zinc-600" : "text-white"}`}>{time}</div>
                        <div className={`flex-1 h-px ${isPast ? "bg-zinc-800/50" : "bg-zinc-800"}`} />
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl mb-1.5 transition-all duration-300 ${
                        isPast
                          ? "bg-zinc-900/40 border border-zinc-800/30 opacity-50"
                          : isCurrent
                          ? "bg-zinc-900/80 border border-zinc-700 ring-1 ring-red-500/30"
                          : "bg-zinc-900/80 border border-zinc-800/50"
                      }`}
                    >
                      {/* Stage color indicator */}
                      <div
                        className={`w-1 h-12 rounded-full flex-shrink-0 ${isPast ? "opacity-40" : ""}`}
                        style={{ background: isPast ? `linear-gradient(to bottom, #52525b, #3f3f46)` : `linear-gradient(to bottom, ${colors.accent}, ${colors.accent}80)` }}
                      />

                      {/* Band info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold text-sm leading-tight truncate ${
                            isPast ? "text-zinc-500 line-through decoration-zinc-700" : "text-white"
                          }`}>
                            {item.band.name}
                          </h3>
                          {isCurrent && (
                            <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold animate-pulse">
                              EN VIVO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isPast ? "opacity-50" : ""}`}
                            style={{ backgroundColor: isPast ? "#27272a" : `${colors.accent}25`, color: isPast ? "#71717a" : colors.accent }}
                          >
                            {stageName[item.band.stage]}
                          </span>
                          {endTime && (
                            <span className={`text-[10px] ${isPast ? "text-zinc-600" : "text-zinc-500"}`}>
                              {time} - {endTime}
                            </span>
                          )}
                        </div>

                        {/* Friends */}
                        {item.friendsInfo && item.friendsInfo.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.friendsInfo.map((friend) => (
                              <span
                                key={friend.username}
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  isPast
                                    ? "bg-zinc-800/50 text-zinc-600"
                                    : friend.source === "friend"
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                @{friend.username}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removeBand(item.band.id)}
                        className="flex-shrink-0 p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-800"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 px-4 py-3 pb-safe z-20" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <button onClick={() => router.push("/schedule")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="text-[10px]">Grilla</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-[10px] font-semibold">Mi Agenda</span>
          </button>
          <button onClick={() => router.push("/groups")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[10px]">Social</span>
          </button>
          <button onClick={() => router.push("/profile")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px]">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
