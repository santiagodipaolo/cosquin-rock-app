"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);

          // Si hay un SW nuevo esperando, activarlo y recargar
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          // Detectar cuando un nuevo SW se instala
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener("statechange", () => {
              // Cuando el nuevo SW está instalado y listo, activarlo
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });

          // Verificar actualizaciones cada 1 minuto
          setInterval(() => {
            registration.update();
          }, 60 * 1000);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Cuando un nuevo SW toma control, recargar la página
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }
  }, []);

  return null;
}
