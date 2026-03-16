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

type Pessoa = {
  nome?: string;
  cpf?: string;
  consulta?: string;
  localidade?: string;
  total_recursos_favorecidos?: string;
  quantidade_beneficios?: number;
};

type Beneficio = {
  tipo?: string;
  nis?: string;
  valor_recebido?: string;
  detalhe_href?: string;
  detalhe_evidencia?: string;
  total_valor_recebido?: number;
  total_valor_recebido_formatado?: string;
};

type ConsultaResult = {
  pessoa?: Pessoa;
  beneficios?: Beneficio[];
  id_consulta?: string;
  data_hora_consulta?: string;
};

type RunResult = {
  timestamp: string;
  success: boolean;
  status?: number;
  message: string;
};

const DEFAULT_FORM: FormValues = {
  consultas: [""],
  refinar_busca: false,
};

const MAX_CONSULTAS = 3;

const STORAGE_KEY = "make_front_access_key";

export default function ConsultaPage() {
  const router = useRouter();
  const [authKey, setAuthKey] = useState("");
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [latestRun, setLatestRun] = useState<RunResult | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<any>(null);

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

  const normalizedResults = useMemo(() => {
    if (!responseData) return [] as ConsultaResult[];

    const candidate = responseData?.data ?? responseData;

    if (Array.isArray(candidate)) return candidate as ConsultaResult[];
    if (candidate?.data && Array.isArray(candidate.data)) {
      return candidate.data as ConsultaResult[];
    }
    return [candidate as ConsultaResult];
  }, [responseData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authKey) {
      setAuthError("Chave não encontrada. Faça login novamente.");
      router.replace("/login");
      return;
    }

    // limpa resultados anteriores enquanto a nova consulta é processada
    setResponseData(null);
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
        setResponseData(null);
        return;
      }

      if (consultas.length > MAX_CONSULTAS) {
        setLatestRun({
          timestamp: new Date().toISOString(),
          success: false,
          message: `Use no máximo ${MAX_CONSULTAS} consultas por vez.`,
        });
        setResponseData(null);
        return;
      }

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
          consultas,
          consulta: consultas[0],
          refinar_busca: formValues.refinar_busca,
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
        setResponseData(payload);
        return;
      }

      setLatestRun({
        timestamp: new Date().toISOString(),
        success: true,
        status: payload?.status ?? response.status,
        message: "Consulta enviada e processada com sucesso.",
      });
      setResponseData(payload?.data ?? payload ?? null);
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

        {normalizedResults.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Retorno da consulta</CardTitle>
              <CardDescription>
                {normalizedResults.length} resultado(s) recebido(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {normalizedResults.map((item, index) => (
                <div
                  key={item.id_consulta ?? index}
                  className="space-y-4 rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Consulta {index + 1}
                      </p>
                      <h3 className="text-xl font-semibold">
                        {item.pessoa?.nome ?? "Nome não informado"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.pessoa?.cpf || item.pessoa?.consulta || "Sem documento"}
                      </p>
                    </div>
                    {item.data_hora_consulta && (
                      <p className="text-xs text-muted-foreground">
                        {item.data_hora_consulta}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Localidade</p>
                      <p className="font-medium">
                        {item.pessoa?.localidade ?? "Não informado"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Total recebido</p>
                      <p className="font-medium">
                        {item.pessoa?.total_recursos_favorecidos ??
                          item.beneficios?.[0]?.total_valor_recebido_formatado ??
                          "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Qtd. benefícios</p>
                      <p className="font-medium">
                        {item.pessoa?.quantidade_beneficios ??
                          item.beneficios?.length ??
                          0}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">ID da consulta</p>
                      <p className="font-medium break-words">
                        {item.id_consulta ?? "—"}
                      </p>
                    </div>
                  </div>

                  {item.beneficios && item.beneficios.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Benefícios</h4>
                      <div className="grid gap-3 md:grid-cols-1">
                        {item.beneficios.map((beneficio, bIndex) => (
                          <div
                            key={`${item.id_consulta ?? index}-beneficio-${bIndex}`}
                            className="space-y-3 rounded-md border p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">
                                {beneficio.tipo ?? "Benefício"}
                              </p>
                              {beneficio.valor_recebido && (
                                <span className="text-xs font-medium text-emerald-700">
                                  {beneficio.valor_recebido}
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>NIS: {beneficio.nis ?? "—"}</p>
                              {beneficio.detalhe_href && (
                                <p className="break-all">
                                  Link: {beneficio.detalhe_href}
                                </p>
                              )}
                            </div>

                            {beneficio.detalhe_evidencia && (
                              <div className="space-y-2">
                                <a
                                  href={`data:image/png;base64,${beneficio.detalhe_evidencia}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-md border bg-white"
                                  title="Clique para ampliar em nova aba"
                                >
                                  <img
                                    src={`data:image/png;base64,${beneficio.detalhe_evidencia}`}
                                    alt={`Evidência ${beneficio.tipo ?? ""}`}
                                    className="w-full h-auto object-contain"
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
