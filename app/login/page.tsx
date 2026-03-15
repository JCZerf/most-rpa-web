"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "make_front_access_key";

export default function LoginPage() {
  const router = useRouter();
  const [keyValue, setKeyValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      router.replace("/consulta");
    }
  }, [router]);

  const handleSubmit = async () => {
    if (!keyValue.trim()) {
      setError("Informe a chave de autenticação");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyValue.trim() }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Chave inválida");
      }

      window.localStorage.setItem(STORAGE_KEY, keyValue.trim());
      router.push("/consulta");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao validar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-16">
        <header className="space-y-3 rounded-2xl border border-slate-800 bg-white/5 p-6 shadow-lg shadow-slate-900/40">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            MAKE Light
          </p>
          <h1 className="text-3xl font-semibold">Acesso ao painel</h1>
          <p className="text-slate-300">
            Use a chave de autenticação para liberar a tela de consulta e
            proteger o webhook da automação.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <label className="text-sm text-slate-300">
            Chave de acesso
            <input
              className="mt-2 w-full rounded border border-slate-700 bg-slate-950/60 px-4 py-2 text-slate-100 focus:border-white focus:outline-none"
              type="password"
              placeholder="Cole sua chave secreta"
              value={keyValue}
              onChange={(event) => setKeyValue(event.target.value)}
            />
          </label>
          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
          <button
            className="mt-5 w-full rounded bg-emerald-500/90 px-5 py-3 text-sm font-semibold uppercase tracking-wide transition hover:bg-emerald-500 disabled:opacity-40"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Validando..." : "Entrar"}
          </button>
        </section>
      </main>
    </div>
  );
}
