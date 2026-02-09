"use client";

import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [step, setStep] = useState<"username" | "pin" | "register-pin" | "setup-pin">("username");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const router = useRouter();

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setError("");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();

      if (data.status === "new") {
        setStep("register-pin");
      } else if (data.status === "needs_pin") {
        setStep("setup-pin");
      } else {
        setStep("pin");
      }
      setPin(["", "", "", ""]);
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }

    // Auto-submit cuando se completan los 4 dígitos
    if (value && index === 3) {
      const fullPin = [...newPin].join("");
      if (fullPin.length === 4) {
        handlePinSubmit(fullPin);
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const handlePinSubmit = async (fullPin?: string) => {
    const pinCode = fullPin || pin.join("");
    if (pinCode.length !== 4) return;

    setLoading(true);
    setError("");

    try {
      const isRegistering = step === "register-pin" || step === "setup-pin";
      const result = await signIn("credentials", {
        username: username.trim(),
        pin: pinCode,
        isRegistering: isRegistering ? "true" : "false",
        redirect: false,
      });

      if (result?.ok) {
        router.push("/schedule");
      } else {
        if (step === "pin") {
          // En step "pin", el único error posible del usuario es PIN incorrecto
          setError("PIN invalido");
        } else {
          setError("Error al iniciar sesión");
        }
        setPin(["", "", "", ""]);
        pinRefs[0].current?.focus();
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const pinTitle = step === "register-pin"
    ? "Creá tu PIN"
    : step === "setup-pin"
    ? "Configurá tu PIN"
    : "Ingresá tu PIN";

  const pinSubtitle = step === "register-pin"
    ? "Elegí un PIN de 4 dígitos para proteger tu cuenta"
    : step === "setup-pin"
    ? "Tu cuenta necesita un PIN ahora. Elegí 4 dígitos"
    : `Ingresá el PIN de @${username}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring" }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Image
            src="/CR2026.png"
            alt="Cosquín Rock 2026"
            width={300}
            height={150}
            className="mx-auto mb-4"
            priority
          />
          <p className="text-zinc-400 text-sm">Coordiná con tus amigos</p>
        </div>

        {step === "username" ? (
          <motion.form
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleUsernameSubmit}
            className="bg-zinc-900/80 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800"
          >
            <div className="mb-4">
              <label htmlFor="username" className="block text-white text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Tu nombre de usuario"
                autoComplete="off"
                disabled={loading}
              />
              <p className="text-zinc-500 text-xs mt-2">Todo se guarda en minúscula</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-3 text-center">{error}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-3 px-6 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verificando..." : "Continuar"}
            </motion.button>
          </motion.form>
        ) : (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-zinc-900/80 backdrop-blur-lg rounded-2xl p-6 border border-zinc-800"
          >
            <button
              onClick={() => { setStep("username"); setError(""); setPin(["", "", "", ""]); }}
              className="text-zinc-500 hover:text-white transition-colors mb-4 flex items-center gap-1 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>

            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-white mb-1">{pinTitle}</h2>
              <p className="text-zinc-400 text-sm">{pinSubtitle}</p>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={pinRefs[i]}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  disabled={loading}
                  className="w-14 h-16 text-center text-2xl font-bold bg-zinc-800 border-2 border-zinc-700 rounded-xl text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
                />
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePinSubmit()}
              disabled={loading || pin.join("").length !== 4}
              className="w-full py-3 px-6 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verificando..." : step === "pin" ? "Entrar" : "Crear cuenta"}
            </motion.button>
          </motion.div>
        )}

        <p className="text-zinc-600 text-xs text-center mt-4">
          {step === "username"
            ? "Si no tenes cuenta, se crea automáticamente"
            : step === "pin"
            ? "Olvidaste tu PIN? Pedile a un admin"
            : "Recordá tu PIN, lo vas a necesitar para entrar"}
        </p>

        <div className="mt-8 text-center text-xs text-zinc-600">
          <p>Hecho con <span className="text-red-500">♥</span> por <a href="https://x.com/santidipaolo" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-400 transition-colors">Dipa</a></p>
        </div>
      </motion.div>
    </main>
  );
}
