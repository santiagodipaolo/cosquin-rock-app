// Colores únicos y vibrantes para cada escenario
export const stageColors: Record<string, {
  bg: string;
  bgSolid: string;
  border: string;
  text: string;
  gradient: string;
  glow: string;
  accent: string;
}> = {
  NORTE: {
    bg: "bg-rose-500/10",
    bgSolid: "bg-rose-500",
    border: "border-rose-500",
    text: "text-rose-500",
    gradient: "from-rose-500 to-pink-600",
    glow: "shadow-rose-500/25",
    accent: "#f43f5e",
  },
  SUR: {
    bg: "bg-violet-500/10",
    bgSolid: "bg-violet-500",
    border: "border-violet-500",
    text: "text-violet-500",
    gradient: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/25",
    accent: "#8b5cf6",
  },
  MONTANA: {
    bg: "bg-emerald-500/10",
    bgSolid: "bg-emerald-500",
    border: "border-emerald-500",
    text: "text-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/25",
    accent: "#10b981",
  },
  BOOM_ERANG: {
    bg: "bg-amber-500/10",
    bgSolid: "bg-amber-500",
    border: "border-amber-500",
    text: "text-amber-500",
    gradient: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/25",
    accent: "#f59e0b",
  },
  CASITA_BLUES: {
    bg: "bg-sky-500/10",
    bgSolid: "bg-sky-500",
    border: "border-sky-500",
    text: "text-sky-500",
    gradient: "from-sky-500 to-blue-600",
    glow: "shadow-sky-500/25",
    accent: "#0ea5e9",
  },
  PARAGUAY: {
    bg: "bg-teal-500/10",
    bgSolid: "bg-teal-500",
    border: "border-teal-500",
    text: "text-teal-500",
    gradient: "from-teal-500 to-cyan-600",
    glow: "shadow-teal-500/25",
    accent: "#14b8a6",
  },
  PLAZA_ELECTRONICA: {
    bg: "bg-fuchsia-500/10",
    bgSolid: "bg-fuchsia-500",
    border: "border-fuchsia-500",
    text: "text-fuchsia-500",
    gradient: "from-fuchsia-500 to-pink-600",
    glow: "shadow-fuchsia-500/25",
    accent: "#d946ef",
  },
  SORPRESA: {
    bg: "bg-yellow-500/10",
    bgSolid: "bg-yellow-500",
    border: "border-yellow-500",
    text: "text-yellow-500",
    gradient: "from-yellow-500 to-amber-600",
    glow: "shadow-yellow-500/25",
    accent: "#eab308",
  },
};

export const stageName: Record<string, string> = {
  NORTE: "Norte",
  SUR: "Sur",
  MONTANA: "Montaña",
  BOOM_ERANG: "Boomerang",
  CASITA_BLUES: "La Casita del Blues",
  PARAGUAY: "Paraguay",
  PLAZA_ELECTRONICA: "Plaza Electrónica",
  SORPRESA: "Sorpresa",
};

export const stageEmoji: Record<string, string> = {
  NORTE: "🔴",
  SUR: "🟣",
  MONTANA: "🟢",
  BOOM_ERANG: "🟡",
  CASITA_BLUES: "🔵",
  PARAGUAY: "🩵",
  PLAZA_ELECTRONICA: "💜",
  SORPRESA: "⭐",
};
