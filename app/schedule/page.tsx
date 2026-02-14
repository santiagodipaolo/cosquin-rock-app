"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState(0);
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);
  const [gridScale, setGridScale] = useState(1);
  const gridScaleRef = useRef(1);
  const zoomOut = gridScale < 0.7;
  const gridRef = useRef<HTMLDivElement>(null);

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
      fetchNotifications();
    }
  }, [status, selectedDay]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      setPendingNotifications(data.pendingReceived?.length || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Scroll to current time line after loading
  useEffect(() => {
    if (!loading && timeLineRef.current && scrollRef.current) {
      setTimeout(() => {
        timeLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [loading, selectedDay]);

  // Sync gridScale ref
  useEffect(() => { gridScaleRef.current = gridScale; }, [gridScale]);

  // Pinch-to-zoom on the grid
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let startDist = 0;
    let startScale = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        startScale = gridScaleRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const newScale = startScale * (dist / startDist);
        const clamped = Math.min(1, Math.max(0.35, newScale));
        gridScaleRef.current = clamped;
        setGridScale(clamped);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (startDist > 0 && e.touches.length < 2) {
        startDist = 0;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

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
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 flex-shrink-0 z-20">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Cosquin Rock 2026</h1>
              <p className="text-xs text-zinc-500">{selectedDay === 1 ? "14 de febrero" : "15 de febrero"}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-sm text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl transition-colors relative border border-zinc-700/50"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                @{session?.user?.name}
                {pendingNotifications > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold ring-2 ring-zinc-950">
                    {pendingNotifications}
                  </span>
                )}
              </button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[200px]"
                  >
                    <div className="p-3 border-b border-zinc-800">
                      <p className="text-sm font-semibold text-white">@{session?.user?.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Usuario</p>
                    </div>
                    {pendingNotifications > 0 && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push("/groups");
                        }}
                        className="w-full px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors border-b border-zinc-800 flex items-center justify-between"
                      >
                        <span className="text-sm text-white">Solicitudes de amistad</span>
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {pendingNotifications}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        await signOut({ redirect: false });
                        router.push("/login");
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-zinc-800 transition-colors text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
              Dia 1 - Sabado 14
            </button>
            <button
              onClick={() => { setSelectedDay(2); setActiveStageFilter(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                selectedDay === 2
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Dia 2 - Domingo 15
            </button>
          </div>

          {/* Stage filter chips */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
            <button
              onClick={() => {
                if (zoomOut) {
                  setGridScale(1);
                } else {
                  const fitScale = (window.innerWidth - 16) / (stages.length * 120 + 56);
                  setGridScale(Math.max(0.35, Math.min(0.65, fitScale)));
                }
                setActiveStageFilter(null);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${
                zoomOut
                  ? "bg-primary text-white shadow-lg shadow-primary/30"
                  : "bg-zinc-700/80 text-zinc-300 border border-zinc-600/50 hover:bg-zinc-600/80"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={zoomOut ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"} />
              </svg>
              {zoomOut ? "Zoom +" : "Zoom -"}
            </button>
            <button
              onClick={() => { setActiveStageFilter(null); setGridScale(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                activeStageFilter === null && !zoomOut
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
                  onClick={() => { setActiveStageFilter(activeStageFilter === stage ? null : stage); setGridScale(1); }}
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
      <div ref={scrollRef} className="flex-1 min-h-0 pb-16 overflow-auto">
        {loading ? (
          <div className="p-6 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-zinc-400 text-sm">Cargando grilla...</span>
          </div>
        ) : (
          <div className="flex min-w-full" style={{ zoom: gridScale }}>
            {/* Columna de horarios */}
            <div className="sticky left-0 z-10 flex-shrink-0 bg-zinc-950 w-14">
              <div className="h-10 border-b border-zinc-800/50 flex items-center justify-center sticky top-0 z-20 bg-zinc-950">
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
                  <div className="h-[56px] border-b border-zinc-700/50 flex items-center justify-center bg-zinc-950">
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
                  className="flex-1 border-r border-zinc-700/40 min-w-[120px]"
                >
                  {/* Header del escenario */}
                  <div className={`h-10 border-b border-zinc-800/50 flex items-center justify-center px-0.5 bg-gradient-to-r ${colors.gradient} sticky top-0 z-10`}>
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
                          className="h-[56px] border-b border-zinc-700/50 p-0.5"
                          style={{ backgroundColor: `${colors.accent}18` }}
                        >
                          {band ? (
                            <motion.div
                              ref={(el) => {
                                if (el) bandRefs.current[`${band.stage}-${band.id}`] = el;
                              }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setSelectedBand(band)}
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
                                <h3 className={`text-xs font-bold leading-tight line-clamp-2 text-center w-full ${
                                  isPast ? "text-zinc-500" : band.isAttending ? "text-white drop-shadow-md" : "text-zinc-400"
                                }`}>
                                  {band.name}
                                </h3>
                              </div>

                              {/* Indicador de amigos */}
                              {!zoomOut && band.friendsInfo && band.friendsInfo.length > 0 && (
                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                  <svg className={`w-2.5 h-2.5 ${isPast ? "text-zinc-600" : band.isAttending ? "text-white/70" : "text-zinc-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                  </svg>
                                  <span className={`text-[9px] font-bold ${isPast ? "text-zinc-600" : band.isAttending ? "text-white/70" : "text-zinc-500"}`}>
                                    {band.friendsInfo.length}
                                  </span>
                                </div>
                              )}

                              {/* Check icon */}
                              {band.isAttending && !isPast && !zoomOut && (
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

      {/* Band Detail Modal */}
      <AnimatePresence>
        {selectedBand && (() => {
          const colors = stageColors[selectedBand.stage];
          const time = new Date(selectedBand.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
          const isPast = isBandPast(selectedBand);
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40"
                onClick={() => setSelectedBand(null)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl border-t border-zinc-700/50 max-h-[70vh] overflow-y-auto"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                </div>

                <div className="px-5 pb-4">
                  {/* Stage badge + time */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-semibold text-white"
                      style={{ backgroundColor: colors.accent }}
                    >
                      {stageName[selectedBand.stage]}
                    </span>
                    <span className="text-sm text-zinc-400">{time} hs</span>
                  </div>

                  {/* Band name */}
                  <h2 className="text-xl font-bold text-white mb-4">{selectedBand.name}</h2>

                  {/* Attendance toggle */}
                  <button
                    onClick={() => {
                      toggleAttendance(selectedBand.id, selectedBand.isAttending || false);
                      setSelectedBand({
                        ...selectedBand,
                        isAttending: !selectedBand.isAttending,
                      });
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 mb-4 ${
                      selectedBand.isAttending
                        ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                        : "text-white shadow-lg"
                    }`}
                    style={
                      !selectedBand.isAttending
                        ? { backgroundColor: colors.accent }
                        : undefined
                    }
                  >
                    {selectedBand.isAttending ? "No voy" : "Voy!"}
                  </button>

                  {/* Friends list */}
                  {selectedBand.friendsInfo && selectedBand.friendsInfo.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Amigos que van ({selectedBand.friendsInfo.length})
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBand.friendsInfo.map((friend) => (
                          <span
                            key={friend.username}
                            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              friend.source === "friend"
                                ? "bg-primary/25 text-primary border border-primary/40"
                                : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                            }`}
                          >
                            @{friend.username}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
