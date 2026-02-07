"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { stageColors, stageName } from "@/lib/stage-colors";

type FriendInfo = {
  username: string;
  source: "group" | "friend";
};

type Band = {
  id: string;
  name: string;
  day: number;
  stage: string;
  startTime: string;
  endTime: string;
  isAttending?: boolean;
  friendsGoing?: number;
  friendsList?: string[];
  friendsInfo?: FriendInfo[];
};

type TimeSlot = {
  time: string;
  timestamp: number;
  bands: Record<string, Band | null>;
};

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<1 | 2>(1);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [activeStageFilter, setActiveStageFilter] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeLineRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [highlightedBand, setHighlightedBand] = useState<string | null>(null);
  const bandRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const stages =
    selectedDay === 1
      ? ["NORTE", "SUR", "MONTANA", "BOOM_ERANG", "CASITA_BLUES", "PLAZA_ELECTRONICA", "SORPRESA"]
      : ["NORTE", "SUR", "MONTANA", "PARAGUAY", "CASITA_BLUES", "PLAZA_ELECTRONICA", "SORPRESA"];

  const filteredStages = activeStageFilter
    ? stages.filter((s) => s === activeStageFilter)
    : stages;

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, selectedDay]);

  // Scroll to current time line after loading
  useEffect(() => {
    if (!loading && timeLineRef.current && scrollRef.current) {
      setTimeout(() => {
        timeLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [loading, selectedDay]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const bandsRes = await fetch(`/api/bands?day=${selectedDay}`);
      const bandsData = await bandsRes.json();

      const attendanceRes = await fetch("/api/attendance");
      const attendanceData = await attendanceRes.json();
      const attendingIds = new Set(attendanceData.map((a: any) => a.bandId));

      const enrichedBands = await Promise.all(
        bandsData.map(async (band: Band) => {
          const friendsRes = await fetch(`/api/attendance?bandId=${band.id}`);
          const friendsData = await friendsRes.json();

          return {
            ...band,
            isAttending: attendingIds.has(band.id),
            friendsGoing: friendsData.length,
            friendsList: friendsData.map((f: any) => f.user.username),
            friendsInfo: friendsData.map((f: any) => ({
              username: f.user.username,
              source: f.source || "group",
            })),
          };
        })
      );

      setBands(enrichedBands);
      organizeByTimeSlots(enrichedBands);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const organizeByTimeSlots = (bandsData: Band[]) => {
    const slots = new Map<string, { timestamp: number; bands: Record<string, Band | null> }>();

    bandsData.forEach((band) => {
      const date = new Date(band.startTime);
      const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

      if (!slots.has(time)) {
        slots.set(time, { timestamp: date.getTime(), bands: {} });
      }
      slots.get(time)!.bands[band.stage] = band;
    });

    const sortedSlots: TimeSlot[] = Array.from(slots.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .map(([time, data]) => ({ time, timestamp: data.timestamp, bands: data.bands }));

    setTimeSlots(sortedSlots);
  };

  const toggleAttendance = async (bandId: string, currentlyAttending: boolean) => {
    // Actualización optimista del UI
    setTimeSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        bands: Object.fromEntries(
          Object.entries(slot.bands).map(([stage, band]) => [
            stage,
            band && band.id === bandId
              ? { ...band, isAttending: !currentlyAttending }
              : band,
          ])
        ),
      }))
    );

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bandId, attending: !currentlyAttending }),
      });
      if (!res.ok) {
        // Solo revertir si falla
        await fetchData();
      }
    } catch (error) {
      console.error("Error toggling attendance:", error);
      // Revertir cambios si hay error
      await fetchData();
    }
  };

  const isBandPast = useCallback((band: Band) => {
    return new Date(band.endTime).getTime() < now;
  }, [now]);

  const findTimeLinePosition = useCallback(() => {
    // Find where the current time falls between slots
    for (let i = 0; i < timeSlots.length; i++) {
      if (timeSlots[i].timestamp > now) {
        return i;
      }
    }
    return -1; // All slots are in the past
  }, [timeSlots, now]);

  const timeLinePosition = findTimeLinePosition();

  const searchResults = bands.filter(
    (band) =>
      band.day === selectedDay &&
      band.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const handleBandClick = (band: Band) => {
    const bandKey = `${band.stage}-${band.id}`;
    const element = bandRefs.current[bandKey];

    if (element && scrollRef.current) {
      // Scrollear hasta la banda
      const container = scrollRef.current;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      container.scrollTo({
        left: element.offsetLeft - containerRect.width / 2 + elementRect.width / 2,
        top: element.offsetTop - containerRect.height / 2 + elementRect.height / 2,
        behavior: "smooth",
      });

      // Highlight temporal
      setHighlightedBand(band.id);
      setTimeout(() => setHighlightedBand(null), 3000);
    }

    setSearchQuery("");
    setShowSearchResults(false);
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

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 flex-shrink-0 z-20">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Cosquin Rock 2026</h1>
              <p className="text-xs text-zinc-500">{selectedDay === 1 ? "14 de febrero" : "15 de febrero"}</p>
            </div>
            <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
              @{session?.user?.name}
            </span>
          </div>

          {/* Search Bar */}
          <div className="mb-3 relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(e.target.value.length > 0);
                }}
                onFocus={() => setShowSearchResults(searchQuery.length > 0)}
                placeholder="Buscar banda... (ej: La Vela Puerca)"
                className="w-full px-4 py-2.5 pl-10 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden z-30 shadow-2xl"
              >
                {searchResults.map((band) => {
                  const colors = stageColors[band.stage];
                  const time = new Date(band.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <button
                      key={band.id}
                      onClick={() => handleBandClick(band)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                    >
                      <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: colors.accent }} />
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-white text-sm">{band.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: `${colors.accent}25`, color: colors.accent }}
                          >
                            {stageName[band.stage]}
                          </span>
                          <span className="text-[10px] text-zinc-500">{time}</span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
                {searchQuery && searchResults.length === 0 && (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No se encontró "{searchQuery}"
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Day toggle */}
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-3">
            <button
              onClick={() => { setSelectedDay(1); setActiveStageFilter(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedDay === 1
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Dia 1 - Viernes 14
            </button>
            <button
              onClick={() => { setSelectedDay(2); setActiveStageFilter(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedDay === 2
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Dia 2 - Sabado 15
            </button>
          </div>

          {/* Stage filter chips */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
            <button
              onClick={() => setActiveStageFilter(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                activeStageFilter === null
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-700/80 text-zinc-300 border border-zinc-600/50 hover:bg-zinc-600/80"
              }`}
            >
              Todos
            </button>
            {stages.map((stage) => {
              const colors = stageColors[stage];
              return (
                <button
                  key={stage}
                  onClick={() => setActiveStageFilter(activeStageFilter === stage ? null : stage)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                    activeStageFilter === stage
                      ? `text-white shadow-lg ${colors.glow} border-2 border-white/30 ring-2`
                      : `text-zinc-400 hover:opacity-80 opacity-60`
                  }`}
                  style={
                    activeStageFilter === stage
                      ? { backgroundColor: `${colors.accent}90`, ['--tw-ring-color' as any]: `${colors.accent}60` }
                      : { backgroundColor: `${colors.accent}15`, border: `1px solid ${colors.accent}20` }
                  }
                >
                  {stageName[stage]}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Grid */}
      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0 pb-16">
        {loading ? (
          <div className="p-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-zinc-400 text-sm">Cargando grilla...</span>
          </div>
        ) : (
          <div className="flex min-w-full">
            {/* Columna de horarios */}
            <div className="sticky left-0 z-10 flex-shrink-0 bg-zinc-950 w-14">
              <div className="h-10 border-b border-zinc-800/50 flex items-center justify-center">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Hora</span>
              </div>
              {timeSlots.map((slot, i) => (
                <div key={slot.time} className="relative">
                  {/* Time line indicator */}
                  {i === timeLinePosition && (
                    <div ref={timeLineRef} className="absolute top-0 left-0 right-0 z-30 -translate-y-1/2">
                      <div className="flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50 flex-shrink-0" />
                      </div>
                    </div>
                  )}
                  <div className="h-[100px] border-b border-zinc-700/50 flex items-center justify-center bg-zinc-950">
                    <span className={`text-xs font-bold tabular-nums ${
                      timeLinePosition !== -1 && i < timeLinePosition ? "text-zinc-600" : "text-zinc-300"
                    }`}>
                      {slot.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Columnas de escenarios */}
            {filteredStages.map((stage) => {
              const colors = stageColors[stage];
              return (
                <div
                  key={stage}
                  className="flex-1 min-w-[120px] border-r border-zinc-700/40"
                >
                  {/* Header del escenario */}
                  <div className={`h-10 border-b border-zinc-800/50 flex items-center justify-center px-1 bg-gradient-to-r ${colors.gradient}`}>
                    <span className="text-[10px] font-bold text-white text-center drop-shadow-sm leading-tight">{stageName[stage]}</span>
                  </div>

                  {/* Bandas */}
                  {timeSlots.map((slot, slotIdx) => {
                    const band = slot.bands[stage];
                    const isPast = band ? isBandPast(band) : (timeLinePosition !== -1 && slotIdx < timeLinePosition);

                    return (
                      <div key={`${stage}-${slot.time}`} className="relative">
                        {/* Time line across all columns */}
                        {slotIdx === timeLinePosition && (
                          <div className="absolute top-0 left-0 right-0 z-20 -translate-y-1/2 pointer-events-none">
                            <div className="w-full h-[2px] bg-red-500 shadow-sm shadow-red-500/50" />
                          </div>
                        )}
                        <div
                          className="h-[100px] border-b border-zinc-700/50 p-0.5"
                          style={{ backgroundColor: `${colors.accent}18` }}
                        >
                          {band ? (
                            <motion.div
                              ref={(el) => {
                                if (el) bandRefs.current[`${band.stage}-${band.id}`] = el;
                              }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => toggleAttendance(band.id, band.isAttending || false)}
                              className={`h-full rounded-xl cursor-pointer flex flex-col justify-center relative overflow-hidden transition-all duration-200 ${
                                isPast
                                  ? "opacity-50"
                                  : band.isAttending
                                  ? `shadow-lg ${colors.glow} border-2 border-white/30 ring-2`
                                  : highlightedBand === band.id
                                  ? `shadow-xl ring-4 ring-yellow-400 animate-pulse`
                                  : "opacity-60"
                              }`}
                              style={{
                                padding: "5px 7px",
                                ...(isPast
                                  ? { backgroundColor: `${colors.accent}10`, border: `1px solid ${colors.accent}15` }
                                  : band.isAttending
                                  ? { backgroundColor: `${colors.accent}90`, ringColor: `${colors.accent}60` }
                                  : highlightedBand === band.id
                                  ? { backgroundColor: `${colors.accent}95`, border: `3px solid #facc15` }
                                  : { backgroundColor: `${colors.accent}15`, border: `1px solid ${colors.accent}20` }
                                ),
                              }}
                            >
                              {/* Nombre */}
                              <div className="flex-1 min-h-0 flex items-center">
                                <h3 className={`text-sm font-bold leading-tight line-clamp-2 text-center w-full ${
                                  isPast ? "text-zinc-500" : band.isAttending ? "text-white drop-shadow-md" : "text-zinc-400"
                                }`}>
                                  {band.name}
                                </h3>
                              </div>

                              {/* Amigos que van - siempre visible */}
                              {band.friendsInfo && band.friendsInfo.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                                  {band.friendsInfo.slice(0, 3).map((friend) => (
                                    <span
                                      key={friend.username}
                                      className={`text-[8px] px-1 py-0 rounded-full font-semibold ${
                                        isPast
                                          ? "bg-zinc-800 text-zinc-500"
                                          : band.isAttending
                                          ? friend.source === "friend"
                                            ? "bg-primary/30 text-white"
                                            : "bg-white/25 text-white"
                                          : friend.source === "friend"
                                          ? "bg-primary/15 text-primary-light"
                                          : "bg-zinc-800/80 text-zinc-400"
                                      }`}
                                      style={
                                        !isPast && friend.source === "friend" && !band.isAttending
                                          ? { borderBottom: "1px dashed rgba(255,107,53,0.4)" }
                                          : undefined
                                      }
                                    >
                                      {friend.username}
                                    </span>
                                  ))}
                                  {band.friendsInfo.length > 3 && (
                                    <span className={`text-[8px] px-1 rounded-full font-semibold ${
                                      isPast
                                        ? "bg-zinc-800 text-zinc-500"
                                        : band.isAttending ? "bg-white/25 text-white" : "bg-zinc-800/80 text-zinc-400"
                                    }`}>
                                      +{band.friendsInfo.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Check icon */}
                              {band.isAttending && !isPast && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-white/30 rounded-full flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}

                            </motion.div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 px-4 py-3 pb-safe z-20" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <button className="flex flex-col items-center gap-0.5 text-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="text-[10px] font-semibold">Grilla</span>
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
