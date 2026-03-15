"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormValues = {
  id_consulta: string;
  consulta: string;
  refinar_busca: string;
};

type RunResult = {
  timestamp: string;
  success: boolean;
  status?: number;
  error?: string;
  data?: unknown;
};

const DEFAULT_FORM: FormValues = {
  id_consulta: "demo-cpf-001",
  consulta: "A LIDA PEREIRA FIALHO",
  refinar_busca: "false",
};

const STORAGE_KEY = "make_front_access_key";

export default function ConsultaPage() {
  const router = useRouter();
  const [authKey, setAuthKey] = useState("");
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      router.replace("/login");
      return;
    }
    setAuthKey(stored);
  }, [router]);

  const latestRun = runs[0];

  const feedback = useMemo(() => {
    if (!latestRun) {
      return "Submeta os dados acima para acionar o MAKE.";
    }
    if (latestRun.success) {
      return `Última execução em ${new Date(latestRun.timestamp).toLocaleTimeString(
        "pt-BR"
      )}`;
    }
    return latestRun.error ?? "Ocorreu um erro.";
  }, [latestRun]);

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    router.replace("/login");
  };

  const handleFormChange = (field: keyof FormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authKey) {
      setAuthError("Chave não encontrada. Faça login novamente.");
      router.replace("/login");
      return;
    }

    setSubmitBusy(true);
    setAuthError(null);
    try {
      const response = await fetch("/api/make", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-key": authKey,
        },
        body: JSON.stringify(formValues),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = payload?.error ?? "Erro ao chamar o MAKE";
        setRuns((prev) => [
          {
            timestamp: new Date().toISOString(),
            success: false,
            status: response.status,
            error: errorMessage,
            data: payload?.details,
          },
          ...prev,
        ]);
        return;
      }

      setRuns((prev) => [
        {
          timestamp: new Date().toISOString(),
          success: true,
          status: payload?.status ?? response.status,
          data: payload?.data ?? payload,
        },
        ...prev,
      ]);
    } finally {
      setSubmitBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-white/5 p-6 shadow-lg shadow-slate-900/40 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
              MAKE Light
            </p>
            <h1 className="text-3xl font-semibold">Consulta</h1>
            <p className="text-slate-300">
              Preencha os parâmetros e confira o retorno da automação.
            </p>
          </div>
          <button
            className="rounded border border-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white"
            onClick={handleLogout}
          >
            Sair
          </button>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Dados do hook</h2>
            <span className="text-sm text-slate-400">{feedback}</span>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="text-sm text-slate-300">
              id_consulta
              <input
                className="mt-1 w-full rounded border border-slate-700 bg-black/20 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                value={formValues.id_consulta}
                onChange={(event) =>
                  handleFormChange("id_consulta", event.target.value)
                }
                placeholder="demo-cpf-001"
              />
            </label>

            <label className="text-sm text-slate-300">
              consulta
              <input
                className="mt-1 w-full rounded border border-slate-700 bg-black/20 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                value={formValues.consulta}
                onChange={(event) =>
                  handleFormChange("consulta", event.target.value)
                }
                placeholder="Nome do cliente ou CNPJ"
              />
            </label>

            <label className="text-sm text-slate-300">
              refinar_busca
              <select
                className="mt-1 w-full rounded border border-slate-700 bg-black/20 px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
                value={formValues.refinar_busca}
                onChange={(event) =>
                  handleFormChange("refinar_busca", event.target.value)
                }
              >
                <option value="false">false</option>
                <option value="true">true</option>
              </select>
            </label>

            <button
              type="submit"
              className="mt-2 rounded bg-emerald-500/90 px-5 py-3 text-sm font-semibold uppercase tracking-wide transition hover:bg-emerald-500 focus:outline-none disabled:opacity-40"
              disabled={submitBusy}
            >
              {submitBusy ? "Enviando..." : "Enviar para o MAKE"}
            </button>
          </form>
          {authError && (
            <p className="mt-4 text-sm text-rose-400">{authError}</p>
          )}
        </section>

        {latestRun && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Último retorno</h2>
              <span
                className={
                  latestRun.success ? "text-emerald-300" : "text-rose-300"
                }
              >
                {latestRun.success ? "sucesso" : "erro"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              status {latestRun.status ?? "desconhecido"} ·{" "}
              {new Date(latestRun.timestamp).toLocaleString("pt-BR")}
            </p>
            <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-black/50 p-4 text-xs text-slate-100">
              {JSON.stringify(latestRun.data ?? latestRun.error, null, 2)}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}
