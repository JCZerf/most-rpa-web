import { NextRequest, NextResponse } from "next/server";

const ACCESS_KEY = process.env.MAKE_FRONT_ACCESS_KEY;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

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
    refinar_busca?: string;
  };

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  if (!payload?.id_consulta || !payload?.consulta) {
    return NextResponse.json(
      { error: "Informe id_consulta e consulta" },
      { status: 400 }
    );
  }

  const makePayload = {
    id_consulta: payload.id_consulta,
    consulta: payload.consulta,
    refinar_busca:
      typeof payload.refinar_busca === "undefined"
        ? "false"
        : payload.refinar_busca,
  };

  try {
    const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makePayload),
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
