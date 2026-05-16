# GAMEFICATION // CONCURSO.OS

Sistema de gamificação de estudos para concursos públicos com geração de questões via Claude e extração estruturada de editais.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Anthropic Claude (Sonnet 4.6 + Haiku 4.5).

---

## Rodando localmente

```bash
cp .env.example .env.local       # preencha as 4 chaves
npm install
npm run dev                      # http://localhost:3000
```

Sem chaves preenchidas, `/` redireciona para `/onboarding` e o wizard mostra erro amigável ao tentar processar — o esqueleto da UI funciona, mas a IA e o Supabase precisam de credenciais reais.

## Deploy

Tutorial passo-a-passo (Supabase + Vercel + Anthropic): **[DEPLOY.md](DEPLOY.md)**

Após deploy, valide tudo com `GET /api/health` — retorna 200 quando todas as variáveis estão configuradas e o Supabase está acessível.

## Comandos

| | |
|---|---|
| `npm run dev` | Dev server com HMR |
| `npm run build` | Build de produção (TS + Turbopack) |
| `npm start` | Sirve o build de produção |
| `npm run lint` | ESLint |
