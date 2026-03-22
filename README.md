# Most RPA Web

Interface web para disparar consultas no webhook do MAKE com autenticação por chave de acesso, visualização de resultados e detalhamento por benefício em formato amigável para usuário final.

## Visão Geral

O projeto permite:

- autenticar acesso ao painel com uma chave simples (`MAKE_FRONT_ACCESS_KEY`);
- enviar de 1 a 3 consultas por execução;
- encaminhar as consultas ao MAKE via backend seguro (sem expor credenciais no front);
- visualizar resultados em cards resumidos;
- abrir uma tela de detalhes com informações completas de cada consulta (sem exibição de JSON bruto).

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Componentes UI locais (`components/ui`)

## Estrutura Principal

- `app/login/page.tsx`: tela de autenticação por chave.
- `app/consulta/page.tsx`: formulário de envio da consulta.
- `app/consulta/resultado/page.tsx`: lista de resultados.
- `app/consulta/resultado/detalhe/page.tsx`: detalhes completos da consulta selecionada.
- `app/api/auth/route.ts`: validação da chave do front.
- `app/api/make/route.ts`: proxy seguro para o webhook do MAKE.

## Variáveis de Ambiente

Crie um arquivo `.env` baseado em `.env.example`:

```bash
MAKE_WEBHOOK_URL=https://hook.make.com/...
MAKE_FRONT_ACCESS_KEY=sua-chave-secreta
Consulta_key=sua-chave-make
MAKE_API_KEY_HEADER=x-make-apikey
```

Descrição:

- `MAKE_WEBHOOK_URL`: URL do webhook no MAKE.
- `MAKE_FRONT_ACCESS_KEY`: chave usada para liberar acesso ao painel.
- `Consulta_key`: chave enviada ao MAKE no header configurado.
- `MAKE_API_KEY_HEADER`: nome do header da API key no webhook (padrão recomendado: `x-make-apikey`).

## Como Rodar Localmente

```bash
npm install
npm run dev
```

Acesse: `http://localhost:3000`

## Fluxo da Aplicação

1. Usuário entra em `/login` e informa a chave de acesso.
2. Em `/consulta`, preenche entre 1 e 3 consultas.
3. O front chama `POST /api/make` com:

```json
{
  "consultas": ["04031769644", "A ANNE CHRISTINE SILVA RIBEIRO"],
  "refinar_busca": true
}
```

4. O backend valida a chave (`x-access-key`) e encaminha ao webhook MAKE com `Consulta_key` no header configurado.
5. Em sucesso, o front redireciona para `/consulta/resultado`.
6. O usuário pode abrir `/consulta/resultado/detalhe?i=<index>` para ver os dados completos da consulta.

## Contrato com o MAKE

### Entrada enviada ao webhook

- Header de autenticação: `MAKE_API_KEY_HEADER: Consulta_key`
- Body:

```json
{
  "consultas": ["..."],
  "refinar_busca": true
}
```

### Resposta esperada (resumo)

A aplicação está preparada para respostas no formato:

- `data.resultados[]`, contendo `resultado.pessoa` e `resultado.beneficios[]`.

## Mapeamento de Benefícios (Front + Back)

A tela de detalhes usa mapeamento específico por tipo de benefício (não usa um layout único para todos):

- `Auxílio Emergencial`:
  - parcelas com `mes_disponibilizacao`, `parcela`, `uf`, `enquadramento`, `valor`, `observacao`.
- `Auxílio Brasil`:
  - parcelas com `mes_folha`, `mes_referencia`, `uf`, `municipio`, `valor_parcela` (fallback `valor`).
- `Beneficiário de Bolsa Família`:
  - parcelas com `mes_folha`, `mes_referencia`, `uf`, `municipio`, `valor`, `quantidade_dependentes`.
- `Novo Bolsa Família`:
  - parcelas com `mes_folha`, `mes_referencia`, `uf`, `municipio`, `valor_parcela` (fallback `valor`).

Quando um campo não existe, a interface exibe `N/A`.

## Segurança

- Credenciais do MAKE ficam apenas no backend (`app/api/make/route.ts`).
- O front nunca chama diretamente o webhook externo.
- Acesso ao painel protegido por chave de sessão local (`localStorage`).

## Build de Produção

```bash
npm run build
npm run start
```

## Ambiente de Produção

- URL de produção: `https://most-rpa-web.vercel.app/login`
- Plataforma: Vercel

## Smoke Tests (Pós-Deploy)

Execute esta validação rápida sempre após um novo deploy:

1. Acessar `/login` e autenticar com `MAKE_FRONT_ACCESS_KEY`.
2. Enviar 1 consulta em `/consulta` e validar redirecionamento para `/consulta/resultado`.
3. Enviar 2 e 3 consultas na mesma execução e validar renderização de múltiplos cards.
4. Abrir `Ver detalhes` e validar campos por tipo de benefício:
   - `Auxílio Emergencial`: mês de disponibilização, parcela, UF, enquadramento, valor, observação.
   - `Auxílio Brasil`: mês folha, mês referência, valor da parcela, UF, município.
   - `Beneficiário de Bolsa Família`: mês folha, mês referência, valor, UF, município, dependentes.
   - `Novo Bolsa Família`: mês folha, mês referência, valor da parcela, UF, município.
5. Confirmar fallback `N/A` para campos ausentes.
6. Validar cenário de erro (ex.: chave inválida no front) e mensagem amigável ao usuário.
