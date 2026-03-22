"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Pessoa = {
  nome?: string;
  cpf?: string;
  consulta?: string;
  localidade?: string;
  total_recursos_favorecidos?: string;
  quantidade_beneficios?: number;
};

type Parcela = {
  mes_folha?: string;
  mes_referencia?: string;
  mes_disponibilizacao?: string;
  parcela?: string;
  uf?: string;
  municipio?: string;
  enquadramento?: string;
  observacao?: string;
  quantidade_dependentes?: string;
  valor?: string;
  valor_parcela?: string;
};

type Beneficio = {
  tipo?: string;
  nis?: string;
  valor_recebido?: string;
  total_valor_recebido_formatado?: string;
  detalhe_status?: string;
  detalhe_mensagem?: string | null;
  parcelas?: Parcela[];
  [key: string]: unknown;
};

type ConsultaResult = {
  pessoa?: Pessoa;
  beneficios?: Beneficio[];
  id_consulta?: string;
};

type ConsultaEnvelope = {
  consulta?: string;
  status?: string;
  resultado?: ConsultaResult;
};

type ResultadoEntry = {
  summary: ConsultaResult;
  raw: unknown;
};

const STORAGE_KEY = "make_front_access_key";
const RESULT_STORAGE_KEY = "make_consulta_resultados";
const VALUE_FIELDS_BY_TIPO: Record<string, string[]> = {
  "auxilio emergencial": [
    "valor_recebido",
    "total_valor_recebido_formatado",
    "valor_total",
  ],
  "auxilio brasil": [
    "valor_recebido",
    "total_valor_recebido_formatado",
    "valor_total",
  ],
  "beneficiario de bolsa familia": [
    "valor_recebido",
    "total_valor_recebido_formatado",
    "valor_total",
  ],
  "novo bolsa familia": [
    "valor_recebido",
    "total_valor_recebido_formatado",
    "valor_total",
  ],
};

const DEFAULT_VALUE_FIELDS = [
  "valor_recebido",
  "total_valor_recebido_formatado",
  "valor_total",
  "valor_beneficio",
  "valor",
];

const asText = (value?: string | null) => {
  if (!value) return "N/A";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "N/A";
};

const normalizeTipo = (tipo?: string) =>
  (tipo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const asMoney = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes("R$")) return trimmed;
    if (/^\d+(,\d+)?$/.test(trimmed) || /^\d+\.\d+$/.test(trimmed)) {
      const normalized = Number(trimmed.replace(/\./g, "").replace(",", "."));
      if (!Number.isNaN(normalized)) {
        return new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(normalized);
      }
    }
    return trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }
  return null;
};

const resolveBenefitValue = (beneficio: Beneficio): string => {
  const tipoKey = normalizeTipo(beneficio.tipo);
  const fields = VALUE_FIELDS_BY_TIPO[tipoKey] ?? DEFAULT_VALUE_FIELDS;

  for (const field of fields) {
    const money = asMoney(beneficio[field]);
    if (money) return money;
  }

  if (Array.isArray(beneficio.parcelas) && beneficio.parcelas.length > 0) {
    const total = beneficio.parcelas.reduce((sum, parcela) => {
      const value = (parcela.valor ?? parcela.valor_parcela)?.trim();
      if (!value) return sum;
      const numeric = Number(value.replace(/\./g, "").replace(",", "."));
      return Number.isNaN(numeric) ? sum : sum + numeric;
    }, 0);

    if (total > 0) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(total);
    }
  }

  return "N/A";
};

const isAuxilioEmergencial = (tipo?: string) =>
  normalizeTipo(tipo) === "auxilio emergencial";

const isAuxilioBrasil = (tipo?: string) =>
  normalizeTipo(tipo) === "auxilio brasil";

function ConsultaDetalheContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawData = useMemo(() => {
    if (typeof window === "undefined") return null;

    const stored = window.sessionStorage.getItem(RESULT_STORAGE_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as unknown;
    } catch {
      return null;
    }
  }, []);

  const entries = useMemo(() => {
    if (!rawData) return [] as ResultadoEntry[];

    const candidate = rawData as {
      data?: unknown;
      resultados?: ConsultaEnvelope[];
    };

    if (Array.isArray(rawData)) {
      return rawData.map((item) => {
        const envelope = item as ConsultaEnvelope;
        return {
          summary: envelope.resultado ?? (item as ConsultaResult),
          raw: item,
        };
      });
    }

    if (Array.isArray(candidate.resultados)) {
      return candidate.resultados.map((item) => ({
        summary: item.resultado ?? (item as ConsultaResult),
        raw: item,
      }));
    }

    if (Array.isArray(candidate.data)) {
      return candidate.data.map((item) => ({
        summary: item as ConsultaResult,
        raw: item,
      }));
    }

    return [
      {
        summary: rawData as ConsultaResult,
        raw: rawData,
      },
    ];
  }, [rawData]);

  const selectedIndex = useMemo(() => {
    const value = searchParams.get("i");
    if (!value) return -1;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 0) return -1;
    return parsed;
  }, [searchParams]);

  const selectedEntry = selectedIndex >= 0 ? entries[selectedIndex] : undefined;

  const detalhe = useMemo(() => {
    if (!selectedEntry) return null;

    const raw = selectedEntry.raw as Record<string, unknown>;
    if (raw && typeof raw === "object" && "resultado" in raw) {
      return raw as ConsultaEnvelope;
    }

    return {
      consulta: undefined,
      status: undefined,
      resultado: selectedEntry.summary,
    } as ConsultaEnvelope;
  }, [selectedEntry]);

  useEffect(() => {
    const auth = window.localStorage.getItem(STORAGE_KEY);
    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!rawData || !selectedEntry || !detalhe) {
      router.replace("/consulta/resultado");
    }
  }, [router, rawData, selectedEntry, detalhe]);

  const pessoa = detalhe?.resultado?.pessoa;
  const beneficios = detalhe?.resultado?.beneficios ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Transparência Coleta
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Detalhes da consulta</h1>
            <p className="text-sm text-muted-foreground">
              Visualização completa dos dados retornados pela automação.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/consulta/resultado")}>
            Voltar
          </Button>
        </header>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>
              Consulta {selectedIndex >= 0 ? selectedIndex + 1 : "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-muted-foreground">Consulta informada</p>
              <p className="font-medium">{asText(detalhe?.consulta ?? pessoa?.consulta)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{asText(detalhe?.status)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Nome</p>
              <p className="font-medium">{asText(pessoa?.nome)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">CPF</p>
              <p className="font-medium">{asText(pessoa?.cpf)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Localidade</p>
              <p className="font-medium">{asText(pessoa?.localidade)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Quantidade de benefícios</p>
              <p className="font-medium">
                {typeof pessoa?.quantidade_beneficios === "number"
                  ? pessoa.quantidade_beneficios
                  : beneficios.length > 0
                  ? beneficios.length
                  : "N/A"}
              </p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-muted-foreground">Total recebido</p>
              <p className="font-medium">
                {asText(
                  pessoa?.total_recursos_favorecidos ??
                    (beneficios.length > 0 ? resolveBenefitValue(beneficios[0]) : undefined)
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Benefícios</CardTitle>
            <CardDescription>
              {beneficios.length > 0 ? `${beneficios.length} item(ns)` : "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {beneficios.length === 0 && (
              <p className="text-sm text-muted-foreground">N/A</p>
            )}

            {beneficios.map((beneficio, bIndex) => (
              <div key={`${bIndex}-${beneficio.nis ?? "na"}`} className="rounded-lg border p-4">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Tipo de auxílio</p>
                    <p className="font-medium">{asText(beneficio.tipo)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">NIS</p>
                    <p className="font-medium">{asText(beneficio.nis)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Valor recebido</p>
                    <p className="font-medium">{resolveBenefitValue(beneficio)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Status do detalhe</p>
                    <p className="font-medium">{asText(beneficio.detalhe_status)}</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-muted-foreground">Mensagem do detalhe</p>
                    <p className="font-medium">{asText(beneficio.detalhe_mensagem)}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold">Parcelas</p>
                  {beneficio.parcelas && beneficio.parcelas.length > 0 ? (
                    <div className="space-y-2">
                      {beneficio.parcelas.map((parcela, pIndex) => (
                        <div key={`${bIndex}-parcela-${pIndex}`} className="rounded-md border p-3 text-sm">
                          {isAuxilioEmergencial(beneficio.tipo) ? (
                            <div className="grid gap-2 md:grid-cols-3">
                              <p>
                                <span className="text-muted-foreground">Mês de disponibilização:</span>{" "}
                                {asText(parcela.mes_disponibilizacao)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Parcela:</span>{" "}
                                {asText(parcela.parcela)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">UF:</span>{" "}
                                {asText(parcela.uf)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Enquadramento:</span>{" "}
                                {asText(parcela.enquadramento)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Valor:</span>{" "}
                                {asText(parcela.valor)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Observação:</span>{" "}
                                {asText(parcela.observacao)}
                              </p>
                            </div>
                          ) : isAuxilioBrasil(beneficio.tipo) ? (
                            <div className="grid gap-2 md:grid-cols-3">
                              <p>
                                <span className="text-muted-foreground">Mês folha:</span>{" "}
                                {asText(parcela.mes_folha)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Mês referência:</span>{" "}
                                {asText(parcela.mes_referencia)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Valor da parcela:</span>{" "}
                                {asText(parcela.valor_parcela ?? parcela.valor)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">UF:</span>{" "}
                                {asText(parcela.uf)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Município:</span>{" "}
                                {asText(parcela.municipio)}
                              </p>
                            </div>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-3">
                              <p>
                                <span className="text-muted-foreground">Mês folha:</span>{" "}
                                {asText(parcela.mes_folha)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Mês referência:</span>{" "}
                                {asText(parcela.mes_referencia)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Valor:</span>{" "}
                                {asText(parcela.valor ?? parcela.valor_parcela)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">UF:</span>{" "}
                                {asText(parcela.uf)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Município:</span>{" "}
                                {asText(parcela.municipio)}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Dependentes:</span>{" "}
                                {asText(parcela.quantidade_dependentes)}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">N/A</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function ConsultaDetalhePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Carregando detalhes...</CardTitle>
                <CardDescription>Aguarde um instante.</CardDescription>
              </CardHeader>
            </Card>
          </main>
        </div>
      }
    >
      <ConsultaDetalheContent />
    </Suspense>
  );
}
