"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CacheManager() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    // Verificar si ya se cacheo anteriormente
    const cached = localStorage.getItem("offlineCached");
    if (cached) {
      setIsCached(true);
    } else {
      // Mostrar prompt después de 2 segundos
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCacheForOffline = async () => {
    setIsCaching(true);
    try {
      // Precargar todas las APIs críticas para que el SW las cachee
      const endpoints = [
        "/api/bands",
        "/api/attendance",
        "/api/groups",
        "/api/friends",
      ];

      await Promise.all(
        endpoints.map((endpoint) =>
          fetch(endpoint)
            .then((res) => res.json())
            .catch(() => {}) // Ignorar errores si no está autenticado
        )
      );

      localStorage.setItem("offlineCached", "true");
      setIsCached(true);
      setShowPrompt(false);
    } catch (error) {
      console.error("Error caching:", error);
    } finally {
      setIsCaching(false);
    }
  };

  if (isCached) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50 bg-gradient-to-r from-primary to-primary-dark text-white p-4 rounded-xl shadow-2xl"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm mb-1">¿Usar sin internet?</h3>
              <p className="text-xs opacity-90 mb-3">
                Guardá la app para usarla sin señal en el festival
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCacheForOffline}
                  disabled={isCaching}
                  className="flex-1 bg-white text-primary px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
                >
                  {isCaching ? "Guardando..." : "Guardar para offline"}
                </button>
                <button
                  onClick={() => setShowPrompt(false)}
                  className="px-3 py-2 bg-white/20 rounded-lg text-sm"
                >
                  Después
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
