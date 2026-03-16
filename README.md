This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```S

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Painel de execução do MAKE

O fluxo agora está dividido em duas telas:

- `app/login/page.tsx`: o usuário informa a chave de acesso.
- `app/consulta/page.tsx`: a consulta com os parâmetros do webhook.

O painel exige:

- **Chave de acesso** (`MAKE_FRONT_ACCESS_KEY`), que liberta o formulário sem um login completo.
- **URL do webhook** (`MAKE_WEBHOOK_URL`), armazenada apenas no servidor para evitar exposição direta.

O endpoint `app/api/make/route.ts` valida a chave recebida no cabeçalho `x-access-key` e só encaminha as solicitações para o MAKE quando as informações baterem com o ambiente.

### Variáveis de ambiente necessárias

```bash
MAKE_WEBHOOK_URL=https://hook.make.com/...
MAKE_FRONT_ACCESS_KEY=sua-chave-secreta
Consulta_key=sua-chave-make
MAKE_API_KEY_HEADER=x-api-key
```

Use um arquivo `.env` local (não versionado) para guardar esses valores. O `.env.example` continua como referência para quem for usar.

Com as variáveis configuradas, execute `npm run dev` e abra `http://localhost:3000` para liberar o painel com a chave e disparar a automação.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
