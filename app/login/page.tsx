"use client";

import { useEffect, useState } from "react";
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
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-16">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Transparência Coleta
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Acesso ao painel
          </h1>
          <p className="text-sm text-muted-foreground">
            Use a chave de autenticação para liberar a tela de consulta e
            proteger o webhook da automação.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              A chave é validada no servidor antes de liberar o painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="access-key">Chave de acesso</Label>
              <Input
                id="access-key"
                type="password"
                placeholder="Cole sua chave secreta"
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full bg-black text-white hover:bg-black/90"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Validando..." : "Entrar"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
