"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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

type Beneficio = {
  tipo?: string;
  nis?: string;
  total_valor_recebido_formatado?: string;
  valor_recebido?: string;
  parcelas?: { valor?: string }[];
  [key: string]: unknown;
};

type ConsultaResult = {
  pessoa?: Pessoa;
  beneficios?: Beneficio[];
  id_consulta?: string;
};

type ConsultaEnvelope = {
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
      const value = parcela.valor?.trim();
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

export default function ConsultaResultadoPage() {
  const router = useRouter();

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

  useEffect(() => {
    const auth = window.localStorage.getItem(STORAGE_KEY);
    if (!auth) {
      router.replace("/login");
      return;
    }

    if (!rawData) {
      router.replace("/consulta");
    }
  }, [router, rawData]);

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

  const getNis = (beneficios?: Beneficio[]) => {
    const nisValues = Array.from(
      new Set(
        (beneficios ?? [])
          .map((beneficio) => beneficio.nis?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );
    return nisValues.length > 0 ? nisValues.join(" | ") : "N/A";
  };

  const getTiposAuxilio = (beneficios?: Beneficio[]) => {
    const tipos = Array.from(
      new Set(
        (beneficios ?? [])
          .map((beneficio) => beneficio.tipo?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );
    return tipos.length > 0 ? tipos.join(" | ") : "N/A";
  };

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
              Resultado completo da última execução enviada ao webhook.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/consulta")}>
            Nova consulta
          </Button>
        </header>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Retorno da consulta</CardTitle>
            <CardDescription>{entries.length} resultado(s) recebido(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {entries.map((entry, index) => {
              const item = entry.summary;
              return (
                <div
                  key={item.id_consulta ?? item.pessoa?.cpf ?? index}
                  className="space-y-4 rounded-lg border p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Consulta {index + 1}
                      </p>
                      <h3 className="text-xl font-semibold">
                        {item.pessoa?.nome ?? "N/A"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.pessoa?.cpf || item.pessoa?.consulta || "N/A"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => router.push(`/consulta/resultado/detalhe?i=${index}`)}
                    >
                      Ver detalhes
                    </Button>
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Localidade</p>
                      <p className="font-medium">{item.pessoa?.localidade ?? "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Total recebido</p>
                      <p className="font-medium">
                        {item.pessoa?.total_recursos_favorecidos ??
                          (Array.isArray(item.beneficios) && item.beneficios.length > 0
                            ? resolveBenefitValue(item.beneficios[0])
                            : null) ??
                          "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Qtd. benefícios</p>
                      <p className="font-medium">
                        {typeof item.pessoa?.quantidade_beneficios === "number"
                          ? item.pessoa.quantidade_beneficios
                          : Array.isArray(item.beneficios)
                          ? item.beneficios.length
                          : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">NIS</p>
                      <p className="font-medium break-words">{getNis(item.beneficios)}</p>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-muted-foreground">Tipo de auxílio recebido</p>
                      <p className="font-medium break-words">{getTiposAuxilio(item.beneficios)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
