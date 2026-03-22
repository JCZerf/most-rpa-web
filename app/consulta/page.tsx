"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type FormValues = {
  consultas: string[];
  refinar_busca: boolean;
};

type RunResult = {
  timestamp: string;
  success: boolean;
  message: string;
};

const DEFAULT_FORM: FormValues = {
  consultas: [""],
  refinar_busca: false,
};

const MAX_CONSULTAS = 3;
const STORAGE_KEY = "make_front_access_key";
const RESULT_STORAGE_KEY = "make_consulta_resultados";

export default function ConsultaPage() {
  const router = useRouter();
  const [authKey, setAuthKey] = useState("");
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [latestRun, setLatestRun] = useState<RunResult | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      router.replace("/login");
      return;
    }
    setAuthKey(stored);
  }, [router]);

  const feedback = useMemo(() => {
    if (!latestRun) {
      return "Preencha o campo e clique em Consultar.";
    }
    if (latestRun.success) {
      return `Última execução em ${new Date(latestRun.timestamp).toLocaleTimeString(
        "pt-BR"
      )}`;
    }
    return latestRun.message;
  }, [latestRun]);

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    router.replace("/login");
  };

  const handleRefinarChange = (value: boolean) => {
    setFormValues((prev) => ({ ...prev, refinar_busca: value }));
  };

  const handleConsultaChange = (index: number, value: string) => {
    setFormValues((prev) => {
      const updated = [...prev.consultas];
      updated[index] = value;
      return { ...prev, consultas: updated };
    });
  };

  const addConsultaField = () => {
    setFormValues((prev) => {
      if (prev.consultas.length >= MAX_CONSULTAS) return prev;
      return { ...prev, consultas: [...prev.consultas, ""] };
    });
  };

  const removeConsultaField = (index: number) => {
    setFormValues((prev) => {
      if (prev.consultas.length === 1) return prev;
      const updated = prev.consultas.filter((_, i) => i !== index);
      return { ...prev, consultas: updated.length ? updated : [""] };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authKey) {
      setAuthError("Chave não encontrada. Faça login novamente.");
      router.replace("/login");
      return;
    }

    setLatestRun(null);
    setSubmitBusy(true);
    setAuthError(null);

    try {
      const consultas = formValues.consultas
        .map((item) => item.trim())
        .filter(Boolean);

      if (consultas.length === 0) {
        setLatestRun({
          timestamp: new Date().toISOString(),
          success: false,
          message: "Informe ao menos uma consulta.",
        });
        return;
      }

      if (consultas.length > MAX_CONSULTAS) {
        setLatestRun({
          timestamp: new Date().toISOString(),
          success: false,
          message: `Use no máximo ${MAX_CONSULTAS} consultas por vez.`,
        });
        return;
      }

      const response = await fetch("/api/make", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-key": authKey,
        },
        body: JSON.stringify({
          consultas,
          refinar_busca: formValues.refinar_busca,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          payload?.error === "O hook do MAKE respondeu com erro"
            ? "A automação recusou a chamada. Verifique a chave/API key do webhook."
            : "Não foi possível realizar a consulta no momento.";

        setLatestRun({
          timestamp: new Date().toISOString(),
          success: false,
          message: errorMessage,
        });
        return;
      }

      const resultData = payload?.data ?? payload ?? null;

      if (resultData) {
        window.sessionStorage.setItem(
          RESULT_STORAGE_KEY,
          JSON.stringify(resultData)
        );
      }

      setLatestRun({
        timestamp: new Date().toISOString(),
        success: true,
        message: "Consulta enviada e processada com sucesso.",
      });

      router.push("/consulta/resultado");
    } finally {
      setSubmitBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Transparência Coleta
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Consulta</h1>
            <p className="text-sm text-muted-foreground">
              Preencha os parâmetros e confira o retorno da automação.
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </header>

        <Card className="w-full max-w-2xl self-center">
          <CardHeader>
            <CardTitle>Consulta</CardTitle>
            <CardDescription>{feedback}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid w-full gap-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="consulta">Dados para consulta</Label>
                <div className="space-y-2">
                  {formValues.consultas.map((value, index) => (
                    <div
                      key={`consulta-${index}`}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <Input
                        id={`consulta-${index}`}
                        value={value}
                        onChange={(event) =>
                          handleConsultaChange(index, event.target.value)
                        }
                        placeholder={`CPF, NIS ou nome (${index + 1})`}
                      />
                      {formValues.consultas.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeConsultaField(index)}
                          className="w-full sm:w-auto"
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {formValues.consultas.length < MAX_CONSULTAS && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addConsultaField}
                    className="w-full sm:w-auto"
                  >
                    Adicionar consulta
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                <Label htmlFor="beneficiario-switch" className="text-sm font-normal">
                  Apenas Beneficiário de Programa Social
                </Label>
                <Switch
                  id="beneficiario-switch"
                  checked={formValues.refinar_busca}
                  onCheckedChange={handleRefinarChange}
                  className="border border-slate-400 data-checked:border-black data-checked:bg-black data-unchecked:bg-slate-300"
                />
              </div>

              <Button
                type="submit"
                className="bg-black text-white hover:bg-black/90"
                disabled={submitBusy}
              >
                {submitBusy ? "Consultando..." : "Consultar"}
              </Button>
            </form>
            {authError && <p className="mt-4 text-sm text-destructive">{authError}</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
