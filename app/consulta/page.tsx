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
  consulta: string;
  refinar_busca: boolean;
};

type RunResult = {
  timestamp: string;
  success: boolean;
  status?: number;
  message: string;
};

const DEFAULT_FORM: FormValues = {
  consulta: "",
  refinar_busca: false,
};

const STORAGE_KEY = "make_front_access_key";

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

  const handleFormChange = (
    field: keyof FormValues,
    value: string | boolean
  ) => {
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
      const id_consulta =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `consulta-${Date.now()}`;
      const response = await fetch("/api/make", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-key": authKey,
        },
        body: JSON.stringify({
          ...formValues,
          id_consulta,
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
          status: response.status,
          message: errorMessage,
        });
        return;
      }

      setLatestRun({
        timestamp: new Date().toISOString(),
        success: true,
        status: payload?.status ?? response.status,
        message: "Consulta enviada e processada com sucesso.",
      });
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
              <div className="space-y-1.5">
                <Label htmlFor="consulta">Nome, CPF ou NIS</Label>
                <Input
                  id="consulta"
                  value={formValues.consulta}
                  onChange={(event) =>
                    handleFormChange("consulta", event.target.value)
                  }
                  placeholder="Digite o dado para consulta"
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                <Label htmlFor="beneficiario-switch" className="text-sm font-normal">
                  Apenas Beneficiário de Programa Social
                </Label>
                <Switch
                  id="beneficiario-switch"
                  checked={formValues.refinar_busca}
                  onCheckedChange={(checked) =>
                    handleFormChange("refinar_busca", checked)
                  }
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
            {authError && (
              <p className="mt-4 text-sm text-destructive">{authError}</p>
            )}
          </CardContent>
        </Card>

        {latestRun && (
          <Card className="w-full max-w-2xl self-center">
            <CardHeader>
              <CardTitle>Status da consulta</CardTitle>
              <CardDescription>
                status {latestRun.status ?? "desconhecido"} ·{" "}
                {new Date(latestRun.timestamp).toLocaleString("pt-BR")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Resultado:</span>
                <span
                  className={
                    latestRun.success ? "text-emerald-600" : "text-destructive"
                  }
                >
                  {latestRun.success ? "sucesso" : "erro"}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{latestRun.message}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
