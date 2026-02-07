"use client";

import { useEffect } from "react";

export default function CacheManager() {
  useEffect(() => {
    // Cachear automáticamente sin preguntar
    const cached = localStorage.getItem("offlineCached");
    if (!cached) {
      // Cachear después de 3 segundos en segundo plano
      const timer = setTimeout(() => {
        cacheForOffline();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const cacheForOffline = async () => {
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
      console.log("[Cache] App cacheada para uso offline ✅");
    } catch (error) {
      console.error("[Cache] Error caching:", error);
    }
  };

  return null;
}
