"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { use } from "react";
import Image from "next/image";
import { stageColors, stageName } from "@/lib/stage-colors";

type Band = {
  id: string;
  name: string;
  day: number;
  stage: string;
  startTime: string;
  endTime: string;
};

type SharedAgenda = {
  username: string;
  avatar: string;
  type: string;
  bands: Band[];
};

export default function SharedAgendaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [agenda, setAgenda] = useState<SharedAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchSharedAgenda();
  }, [token]);

  const fetchSharedAgenda = async () => {
    try {
      const res = await fetch(`/api/share/${token}`);
      if (res.ok) {
        const data = await res.json();
        setAgenda(data);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">🎸</div>
          <p className="text-zinc-400">Cargando agenda...</p>
        </div>
      </div>
    );
  }

  if (error || !agenda) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-white mb-2">Link inválido</h2>
          <p className="text-zinc-400 mb-6">Este link no existe o expiró</p>
          <a
            href="/login"
            className="px-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg transition-colors inline-block font-semibold"
          >
            Ir a la app
          </a>
        </div>
      </div>
    );
  }

  const day1Bands = agenda.bands
    .filter((b) => b.day === 1)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const day2Bands = agenda.bands
    .filter((b) => b.day === 2)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const renderDayBands = (dayBands: Band[], dayLabel: string) => {
    if (dayBands.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-bold text-white">{dayLabel}</h2>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {dayBands.length} bandas
          </span>
        </div>
        <div className="space-y-2">
          {dayBands.map((band, index) => {
            const colors = stageColors[band.stage] || stageColors.NORTE;
            const time = new Date(band.startTime).toLocaleTimeString("es-AR", {
              hour: "2-digit", minute: "2-digit",
            });

            return (
              <motion.div
                key={band.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50"
              >
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ background: colors.accent }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm">{band.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: `${colors.accent}25`, color: colors.accent }}
                    >
                      {stageName[band.stage] || band.stage}
                    </span>
                    <span className="text-[10px] text-zinc-500">{time}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 overflow-y-auto">
      {/* Header */}
      <header className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white py-8 px-4 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto text-center">
          <Image
            src="/CR2026.png"
            alt="Cosquín Rock 2026"
            width={200}
            height={100}
            className="mx-auto mb-4"
          />
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl"
            style={{ backgroundColor: agenda.avatar || "#FF6B35" }}
          >
            🎸
          </div>
          <h1 className="text-2xl font-bold mb-2">Agenda de @{agenda.username}</h1>
          <p className="text-zinc-400">
            {agenda.type === "both"
              ? "Ambos días"
              : agenda.type === "day1"
              ? "Viernes 14 de Febrero"
              : "Sábado 15 de Febrero"}
          </p>
          <p className="text-zinc-500 text-sm mt-2">{agenda.bands.length} bandas</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {agenda.bands.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-zinc-400">Sin bandas marcadas</p>
          </div>
        ) : (
          <>
            {renderDayBands(day1Bands, "Viernes 14 de Febrero")}
            {renderDayBands(day2Bands, "Sábado 15 de Febrero")}
          </>
        )}

        {/* CTA */}
        <div className="mt-8 mb-8 text-center bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <p className="text-zinc-400 mb-4">¿Querés organizar tu propia agenda?</p>
          <a
            href="/login"
            className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl transition-colors inline-block font-semibold"
          >
            Crear mi agenda
          </a>
        </div>
      </div>
    </div>
  );
}
