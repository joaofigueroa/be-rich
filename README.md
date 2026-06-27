# Be Rich

Gestão financeira pessoal e familiar com livro financeiro conciliável, patrimônio multimoeda, planejamento e importação revisável de extratos brasileiros.

## Stack

- Turborepo + pnpm + TypeScript + Biome
- Next.js App Router, React 19, Tailwind 4 e componentes shadcn-inspired
- Neon/Postgres + Drizzle ORM + migrations UUIDv7
- Better Auth passwordless + Resend
- Vercel Blob privado, Workflow e Cron
- AI SDK + OpenRouter com saída estruturada Zod

## Estrutura

```text
apps/web                 aplicação Next.js, Route Handlers e Workflows
packages/database        schema Drizzle, cliente Neon lazy e migrations
packages/ui              primitives de interface compartilhadas
config/typescript-config configurações TypeScript compartilhadas
```

As leituras seguem `Server Component → service → repository`. Escritas usam `Server Action → service → repository`. Route Handlers ficam limitados a auth, arquivos, exports, cron e início de Workflow. Toda operação financeira valida membership no service; o proxy é apenas uma barreira preliminar.

## Desenvolvimento

1. Use Node 22+ e pnpm 10.12.3.
2. Copie `.env.example` para `.env.local` e informe as credenciais.
3. Execute `pnpm install`, `pnpm db:migrate` e `pnpm dev`.
4. Em outro terminal, quando necessário, execute `pnpm --filter @be-rich/web workflow:dev`.

Comandos úteis:

```bash
pnpm validate
pnpm db:generate
pnpm db:migrate
pnpm build
```

## Importação e privacidade

O arquivo é enviado para Blob privado, processado e apagado em `finally`; a senha de PDF permanece somente na memória da requisição. O Neon guarda hash, metadados e linhas normalizadas para preview. A confirmação inicia um Workflow idempotente de persistência, deduplicação e classificação. A PWA guarda apenas os ícones/shell público e nunca intercepta páginas ou respostas autenticadas.

Formatos: CSV, XLSX, OFX XML/SGML e PDF com texto selecionável. OCR e Open Finance real ficam fora da V0; o contrato `FinancialDataProvider` preserva a fronteira para integração futura.

## Deploy

Crie os recursos Vercel/Neon/Blob/Resend/OpenRouter, vincule o projeto e configure as variáveis de `.env.example`. A migration inicial habilita `pg_uuidv7` e semeia Nubank, Inter, C6, Mercado Pago e instituição genérica. O cron diário em `vercel.json` exige `CRON_SECRET`.

## Dados de teste

Fixtures sanitizadas sintéticas dos quatro bancos ficam junto aos parsers. A homologação final de cada layout depende de extratos reais sanitizados fornecidos pelo proprietário, especialmente PDF e XLSX, pois layouts bancários mudam sem contrato público.
