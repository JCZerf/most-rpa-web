import { NextRequest, NextResponse } from "next/server";

const ACCESS_KEY = process.env.MAKE_FRONT_ACCESS_KEY;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
const MAKE_API_KEY = process.env.Consulta_key;
const MAKE_API_KEY_HEADER =
  process.env.MAKE_API_KEY_HEADER || "x-api-key";

const missingEnvResponse = (
  message: string,
  status: number = 500
): NextResponse =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: NextRequest) {
  if (!MAKE_WEBHOOK_URL) {
    return missingEnvResponse(
      "O endereço do hook do MAKE não está configurado",
      500
    );
  }

  if (!ACCESS_KEY) {
    return missingEnvResponse("A chave de acesso não está configurada", 500);
  }

  const providedKey = request.headers.get("x-access-key");
  if (providedKey !== ACCESS_KEY) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  let payload: {
    id_consulta?: string;
    consulta?: string;
    consultas?: string[];
    refinar_busca?: string | boolean;
  };

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const hasList = Array.isArray(payload?.consultas);
  const consultas = hasList
    ? payload.consultas
        ?.map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => Boolean(item))
    : [];

  if (consultas && consultas.length > 3) {
    return NextResponse.json(
      { error: "Informe no máximo 3 consultas" },
      { status: 400 }
    );
  }

  if (!payload?.consulta && (!consultas || consultas.length === 0)) {
    return NextResponse.json(
      { error: "Informe ao menos uma consulta" },
      { status: 400 }
    );
  }

  const normalizedConsultas =
    consultas && consultas.length > 0
      ? consultas
      : payload.consulta
      ? [payload.consulta]
      : [];

  if (normalizedConsultas.length === 0) {
    return NextResponse.json(
      { error: "Informe ao menos uma consulta" },
      { status: 400 }
    );
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (MAKE_API_KEY) {
      headers[MAKE_API_KEY_HEADER] = MAKE_API_KEY;
    }

    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        consultas: normalizedConsultas,
        consulta: normalizedConsultas[0],
        id_consulta: payload.id_consulta,
        refinar_busca:
          typeof payload.refinar_busca === "undefined"
            ? "false"
            : String(payload.refinar_busca),
      }),
    });

    const rawResponse = await makeResponse.text();
    let parsedResponse: unknown;

    try {
      parsedResponse = JSON.parse(rawResponse);
    } catch {
      parsedResponse = rawResponse;
    }

    if (!makeResponse.ok) {
      return NextResponse.json(
        {
          error: "O hook do MAKE respondeu com erro",
          status: makeResponse.status,
          details: parsedResponse,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      status: makeResponse.status,
      data: parsedResponse,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Não foi possível chamar o MAKE",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 502 }
    );
  }
}
