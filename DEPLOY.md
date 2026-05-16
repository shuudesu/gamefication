# Deploy — GAMEFICATION // CONCURSO.OS

Guia completo do zero até o app no ar. Tempo estimado: **30-45 minutos**.

```
GitHub  ←  código fonte
   │
   ├──→ Supabase  (banco + storage + auth)
   │       └─ migrations aplicadas via SQL Editor
   │
   ├──→ Anthropic (créditos + chave API)
   │
   └──→ Vercel    (hosting Next.js)
           └─ environment variables apontando para Supabase + Anthropic
```

## Pré-requisitos

- [ ] Node 18+ instalado localmente (só pra testar antes de subir)
- [ ] Conta no [GitHub](https://github.com)
- [ ] Conta no [Supabase](https://supabase.com) (free tier basta)
- [ ] Conta no [Vercel](https://vercel.com) (Hobby tier basta)
- [ ] Conta no [Anthropic Console](https://console.anthropic.com) com **cartão de crédito** adicionado (pay-as-you-go, sem mensalidade)

---

## Parte 1 — Subir o código no GitHub

O repositório git local já está pronto. Falta apenas conectar a um repositório remoto.

### 1.1 Criar repositório no GitHub

1. Acesse https://github.com/new
2. **Repository name:** `gamefication` (ou o que preferir)
3. **Privacy:** Private (recomendado — o código é seu)
4. **NÃO** marque "Add a README", "Add .gitignore" ou "Choose a license" — o repo local já tem tudo
5. Clique **Create repository**

### 1.2 Conectar o repo local e fazer push

Na pasta do projeto (PowerShell):

```powershell
git remote add origin https://github.com/SEU_USUARIO/gamefication.git
git branch -M main
git push -u origin main
```

> Se aparecer pedido de login: use o GitHub Desktop, GitHub CLI (`gh auth login`), ou um Personal Access Token.

---

## Parte 2 — Configurar o Supabase

### 2.1 Criar o projeto

1. Acesse https://supabase.com/dashboard
2. Clique **New Project**
3. **Name:** `gamefication-prod`
4. **Database Password:** gere uma senha forte e **GUARDE** (você só verá uma vez)
5. **Region:** `South America (São Paulo)` para menor latência no Brasil
6. **Pricing Plan:** Free
7. Clique **Create new project** e aguarde ~2 minutos

### 2.2 Aplicar as migrations

O sistema tem **3 migrations** que precisam ser aplicadas **na ordem**.

1. No Supabase Dashboard, painel esquerdo → **SQL Editor**
2. Clique **+ New query**
3. **Migration 1** — abra `supabase/migrations/20260515000000_init_schema.sql`, **copie o conteúdo inteiro**, cole no SQL Editor e clique **Run** (ou `Ctrl+Enter`)
4. Aguarde "Success. No rows returned"
5. **Migration 2** — New query → cole `supabase/migrations/20260516000000_exam_intake.sql` → Run
6. **Migration 3** — New query → cole `supabase/migrations/20260517000000_auth_scoping.sql` → Run
7. Confirme que cada uma rodou sem erro

> **Alternativa via Supabase CLI** (se já tiver instalada):
> ```bash
> npx supabase link --project-ref <seu-ref>
> npx supabase db push
> ```

### 2.3 Verificar tabelas, bucket e trigger

1. Painel esquerdo → **Table Editor** → confirme que existem:
   - `users`, `subjects`, `topics`, `questions`, `attempts`, `streaks`
   - `exams` (com coluna `user_id`), `exam_subjects`, `exam_topics`, `study_plan_blocks`
2. Painel esquerdo → **Storage** → confirme o bucket **`editais`** com:
   - Public: `false`
   - File size limit: 50 MB
   - Allowed MIME types: `application/pdf`
3. Painel esquerdo → **Database** → **Triggers** → confirme `on_auth_user_created` em `auth.users` (cria automaticamente o perfil em `public.users` no signup)

### 2.4 Configurar Auth (importante)

1. Painel esquerdo → **Authentication** → **Providers** → confirme que **Email** está habilitado (padrão)
2. **Authentication** → **URL Configuration** → adicione:
   - **Site URL:** `https://SEU-APP.vercel.app` (depois que o Vercel der a URL)
   - **Redirect URLs:** `https://SEU-APP.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`
3. **Opcional — desativar confirmação de email para testar mais rápido:**
   - **Authentication** → **Sign In / Up** → desmarque **"Confirm email"**
   - Em produção real, deixe **marcado** (mais seguro)

### 2.5 Pegar as 3 chaves do Supabase

1. Painel esquerdo → **Project Settings** (engrenagem no canto inferior) → **API**
2. Anote 3 valores (você vai precisar deles para o `.env`):



| O que pegar | Onde fica | Vai para a variável |
|---|---|---|
| **Project URL** | Topo da página | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** | Seção "Project API keys" | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** | Seção "Project API keys" — clique "Reveal" | `SUPABASE_SERVICE_ROLE_KEY` |

> **Importante:** A chave `service_role` **bypassa RLS**. Nunca exponha ela no frontend, em logs públicos ou no GitHub. Ela só vai existir em variáveis de ambiente do servidor (Vercel + `.env.local`).

---

## Parte 3 — Pegar a chave da Anthropic

### 3.1 Adicionar créditos

1. Acesse https://console.anthropic.com
2. Painel esquerdo → **Plans & Billing** → **Add Credit**
3. Recomendo começar com **$5** (dá para ~15 editais + ~1000 questões)
4. Adicione cartão de crédito e confirme

### 3.2 Criar API key

1. Painel esquerdo → **API Keys** → **Create Key**
2. **Name:** `gamefication-prod`
3. **Workspace:** Default (ou o que preferir)
4. Clique **Create**
5. **COPIE A CHAVE AGORA** (`sk-ant-api03-...`) — ela só aparece uma vez. Vai para `ANTHROPIC_API_KEY`.

---

## Parte 4 — Deploy no Vercel

### 4.1 Importar o repositório

1. Acesse https://vercel.com/new
2. **Import Git Repository** → autorize Vercel a acessar seu GitHub se for a primeira vez
3. Localize `gamefication` → clique **Import**

### 4.2 Configurar projeto

- **Framework Preset:** Next.js (auto-detectado)
- **Root Directory:** `./` (padrão)
- **Build Command:** `npm run build` (padrão)
- **Output Directory:** `.next` (padrão)

### 4.3 Adicionar Environment Variables

Antes de clicar Deploy, expanda **Environment Variables** e adicione **as 4 variáveis**:

| Name | Value | Aplicar em |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Production, Preview, Development |

> Por padrão o Vercel marca "Production, Preview, Development" — pode deixar assim.

### 4.4 Deploy

1. Clique **Deploy**
2. Aguarde ~2-3 minutos (build do Next.js + bundling)
3. Quando terminar, o Vercel mostra confetes e a URL: `https://gamefication-xxx.vercel.app`

---

## Parte 5 — Validar o deploy

### 5.1 Health check

Acesse no browser:

```
https://SEU-APP.vercel.app/api/health
```

Resposta esperada (status **200**):

```json
{
  "ok": true,
  "checks": {
    "anthropic_key": true,
    "supabase_url": true,
    "supabase_anon_key": true,
    "supabase_service_role_key": true,
    "supabase_connection": true,
    "editais_bucket": true,
    "exams_table": true,
    "users_table": true,
    "exams_user_scoped": true
  },
  "hint": "Tudo pronto. Acesse / para começar o onboarding."
}
```

Se algum check vier `false`, vá direto para [Troubleshooting](#troubleshooting).

### 5.2 Criar conta e fazer onboarding

1. Acesse `https://SEU-APP.vercel.app/`
2. Vai redirecionar para `/auth/login` (sem sessão)
3. Clique **`> CADASTRAR`** → preencha **nome / email / senha** (mín. 6)
4. Se você desativou "Confirm email" no Supabase: já loga direto
5. Se está ligado: confira o email, clique no link de confirmação, depois volta no app e faz login
6. Após login → vai pra `/onboarding`
7. Suba o **PDF do edital do seu concurso** (ou cole a URL)
8. Clique **`> ANALISAR_EDITAL`**
9. Aguarde 20-50 segundos (Haiku 4.5 + tool use estruturado)
10. Veja o preview com banca, cargo, data, vagas e matérias com pesos
11. Clique **ENTRAR NO DASHBOARD**
12. Dashboard mostra seu nome no header, suas matérias reais, e o tópico de maior prioridade na "Questão do Dia"
13. Clique **PRÓXIMA QUESTÃO** → IA gera questão inédita para o tópico

### 5.3 Validar cross-device

1. Abra a mesma URL no celular (ou em janela anônima do PC)
2. Faça login com o mesmo email/senha
3. Tudo deve aparecer igual: seu edital, suas matérias, sua questão do dia
4. Logout (botão no canto superior direito) → cai em `/auth/login`

---

## Parte 6 — Custos esperados

| Serviço | Plano | Limite Free | Custo após limite |
|---|---|---|---|
| **Supabase** | Free | 500MB DB · 1GB Storage · 50k MAU | $25/mês (Pro) |
| **Vercel** | Hobby | 100GB bandwidth · serverless 60s | $20/mês (Pro) |
| **Anthropic** | Pay-as-you-go | — | Vide tabela abaixo |

### Custos Anthropic (estimativa)

| Operação | Modelo | Tokens (média) | Custo unitário |
|---|---|---|---|
| Extração de edital | Haiku 4.5 | ~80k in / 2k out | ~$0.10 |
| Geração de questão | Sonnet 4.6 | ~1k in / 0.5k out | ~$0.005 |

**Cenário típico** — você + 90 dias de estudo + 5 questões/dia + 1 edital:
- 1 × $0.10 (intake) + 450 × $0.005 (questões) ≈ **$2.40 total**

Cabe tranquilo nos $5 iniciais.

---

## Parte 7 — Troubleshooting

### `/api/health` retorna `anthropic_key: false`

- Você não preencheu `ANTHROPIC_API_KEY` no Vercel ou o valor ainda é o placeholder.
- **Fix:** Vercel → Project → Settings → Environment Variables → confirme o valor e clique **Save**. Em seguida, **Deployments** → clique nos 3 pontos do último deploy → **Redeploy**.

### `/api/health` retorna `supabase_connection: false` mas as 3 keys são `true`

- A URL ou as keys não pertencem ao mesmo projeto.
- Ou as migrations não foram aplicadas (sem tabela `exams` o select falha).
- **Fix:** revise Supabase → Project Settings → API e confirme que copiou tudo do mesmo projeto. Reaplique as migrations.

### `/api/health` retorna `editais_bucket: false`

- A migration 2 não foi aplicada inteira (a parte do `storage.buckets` falhou silenciosamente).
- **Fix:** Supabase → SQL Editor → cole apenas a parte do bucket:
  ```sql
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('editais', 'editais', false, 52428800, array['application/pdf']::text[])
  on conflict (id) do nothing;
  ```

### Onboarding trava em "PROCESSING" e dá timeout

- PDFs muito grandes (>30 páginas escaneadas como imagem) podem exceder os 60s.
- **Fix opção 1:** corte o PDF para apenas as páginas do conteúdo programático antes de enviar.
- **Fix opção 2:** assine o Vercel Pro ($20/mês) e suba `maxDuration` em `vercel.json` para 300.

### Build falha com erro do `pdf-parse` ou `pdfjs-dist`

- Versão do Node muito antiga.
- **Fix:** Vercel → Project → Settings → General → Node.js Version → escolha **20.x** ou superior. Faça redeploy.

### Erro 500 com "ANTHROPIC_API_KEY not configured"

- A chave existe no Vercel mas o deploy ainda usa a versão antiga (sem as variáveis).
- **Fix:** Deployments → Redeploy. Variáveis de ambiente só entram em deploys feitos **depois** de adicioná-las.

### Signup retorna "Email já cadastrado" mas você nunca usou esse email

- O Supabase mantém o usuário mesmo após exclusão "soft". Pode ter sido criado em teste anterior.
- **Fix:** Supabase Dashboard → Authentication → Users → busque pelo email → delete permanentemente.

### Não recebo email de confirmação após signup

- O Supabase Free usa SMTP próprio com rate limit baixo (3-4 emails/h).
- **Fix 1:** Verifique caixa de spam.
- **Fix 2 (rápido):** desative confirmação em Authentication → Sign In/Up → "Confirm email" (só para dev/teste).
- **Fix 3 (produção):** Authentication → Email Templates → conecte um SMTP próprio (Resend, SendGrid, etc.).

### Após login, fico em loop redirect para /auth/login

- A URL do Site no Supabase não bate com o domínio que você está acessando.
- **Fix:** Authentication → URL Configuration → confirme **Site URL** e **Redirect URLs** apontando para o domínio correto (sem barra no final).

### Health check `exams_user_scoped: false`

- A migration 3 (`20260517000000_auth_scoping.sql`) não foi aplicada.
- **Fix:** SQL Editor → cole o conteúdo da migration 3 → Run.

### "permission denied for table exams" no console do browser

- RLS está bloqueando porque o usuário não está autenticado ou a coluna `user_id` não está sendo preenchida.
- **Fix:** confirme que migration 3 rodou. Refaça login. Crie um novo edital — os antigos (pré-auth) ficam órfãos e podem ser deletados pelo Table Editor.

### Erro 502 com "Modelo não retornou tool_use" durante extração

- O texto extraído do PDF veio vazio (PDF escaneado sem OCR).
- **Fix:** rode OCR no PDF antes de subir (ex: Acrobat Pro, ocrmypdf). Ou cole apenas a URL do edital.

### Questão do Dia sempre dá erro "Falha ao gerar próxima questão"

- Sem créditos na Anthropic, ou rate limit.
- **Fix:** console.anthropic.com → Plans & Billing → veja saldo. Se zerou, adicione mais.

---

## Parte 8 — Mantendo o app

### Fazer alterações no código

```powershell
# após mudanças locais
git add .
git commit -m "feat: descrição da mudança"
git push
```

O Vercel detecta o push em `main` e faz redeploy automaticamente. Branches diferentes geram **Preview Deployments** com URLs próprias.

### Adicionar nova migration

1. Crie `supabase/migrations/<timestamp>_<nome>.sql` (timestamp em UTC, formato `YYYYMMDDHHMMSS`)
2. Aplique manualmente no Supabase SQL Editor (ou via `supabase db push`)
3. Comite o arquivo

### Trocar do projeto Supabase de teste para produção

1. Crie um segundo projeto no Supabase (ex: `gamefication-prod`)
2. Aplique as migrations nele
3. No Vercel: troque os valores das variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy

### Domínio personalizado

1. Vercel → Project → Settings → Domains → **Add**
2. Digite `seudominio.com.br`
3. Adicione os registros DNS sugeridos no provedor do seu domínio (Registro.br, GoDaddy, Cloudflare, etc.)
4. Aguarde propagação (~10 min a algumas horas)

---

## Apêndice — Próximos passos sugeridos

O MVP atual cobre: auth completo + ingestão de edital + dashboard adaptado + questão do dia personalizada, com tudo salvo na conta do usuário. Para evoluir, considere:

- **Persistência de attempts** — salvar acertos/erros em `attempts`, calcular streak real de `streaks`
- **Cronograma** — gerar `study_plan_blocks` a partir das horas/dia disponíveis × dias até a prova
- **Múltiplos editais** — header com dropdown para alternar entre concursos
- **Spaced repetition** — tópicos errados voltam priorizados na geração de questões
- **OAuth** (Google/GitHub) — adicionar providers em Supabase → Authentication → Providers
- **Recuperação de senha** — Supabase oferece `resetPasswordForEmail()` — basta criar `/auth/reset-password`

---

**Pronto.** Qualquer dúvida, comece pelo `/api/health` — ele te diz exatamente o que está faltando.
