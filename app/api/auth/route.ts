import { NextRequest, NextResponse } from "next/server";

const FRONT_ACCESS_KEY = process.env.MAKE_FRONT_ACCESS_KEY;

export async function POST(request: NextRequest) {
  if (!FRONT_ACCESS_KEY) {
    return NextResponse.json(
      { error: "Chave de acesso não configurada" },
      { status: 500 }
    );
  }

  let payload: { key?: string };
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  if (!payload?.key) {
    return NextResponse.json({ error: "Informe a chave de autenticação" }, { status: 400 });
  }

  if (payload.key !== FRONT_ACCESS_KEY) {
    return NextResponse.json({ error: "Chave inválida" }, { status: 401 });
  }

  return NextResponse.json({ valid: true });
}
