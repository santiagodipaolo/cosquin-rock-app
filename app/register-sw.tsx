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

          // Verificar actualizaciones cada 5 minutos
          setInterval(() => {
            registration.update();
          }, 5 * 60 * 1000);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
