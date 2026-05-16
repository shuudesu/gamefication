"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Mode = "login" | "signup";

type Props = {
  mode: Mode;
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw new Error(translate(err.message));

        router.push(next);
        router.refresh();
        return;
      }

      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() || email.split("@")[0] },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
              : undefined,
        },
      });

      if (err) throw new Error(translate(err.message));

      if (data.user && data.user.identities?.length === 0) {
        throw new Error("Email já cadastrado. Faça login.");
      }

      if (data.session) {
        router.push(next);
        router.refresh();
        return;
      }

      setInfo(
        "Cadastro criado. Confira seu email para confirmar a conta antes de fazer login."
      );
    } catch (caught) {
      const msg =
        caught instanceof Error ? caught.message : "Erro desconhecido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <section className="border-4 border-foreground bg-surface p-5 sm:p-7 shadow-[8px_8px_0_0_#000]">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center border-[3px] border-foreground bg-accent text-accent-fg">
          <KeyRound className="size-5" strokeWidth={4} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">
            {isLogin ? "ACESSO_OPERADOR" : "CADASTRO_OPERADOR"}
          </p>
          <h2 className="text-lg font-black uppercase tracking-widest leading-none">
            {isLogin ? "Entrar no sistema" : "Criar conta"}
          </h2>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin ? (
          <Field
            id="display_name"
            label="DISPLAY_NAME"
            icon={<User className="size-4" strokeWidth={3} />}
            value={displayName}
            onChange={setDisplayName}
            placeholder="seu nome de operador"
            autoComplete="nickname"
            disabled={loading}
          />
        ) : null}

        <Field
          id="email"
          type="email"
          label="EMAIL"
          icon={<Mail className="size-4" strokeWidth={3} />}
          value={email}
          onChange={setEmail}
          placeholder="voce@exemplo.com"
          autoComplete="email"
          required
          disabled={loading}
        />

        <Field
          id="password"
          type="password"
          label="PASSWORD"
          icon={<KeyRound className="size-4" strokeWidth={3} />}
          value={password}
          onChange={setPassword}
          placeholder={isLogin ? "sua senha" : "mín. 6 caracteres"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
          minLength={6}
          disabled={loading}
        />

        {error ? (
          <div className="flex items-start gap-3 border-4 border-terminal-red bg-terminal-red/10 px-4 py-3 text-[11px] uppercase tracking-widest text-terminal-red">
            <AlertTriangle className="size-4 shrink-0" strokeWidth={4} />
            <span className="font-bold">
              &gt; ERRO_AUTH:{" "}
              <span className="font-sans normal-case">{error}</span>
            </span>
          </div>
        ) : null}

        {info ? (
          <div className="flex items-start gap-3 border-4 border-terminal-green bg-terminal-green/10 px-4 py-3 text-[11px] uppercase tracking-widest text-terminal-green">
            <CheckCircle2 className="size-4 shrink-0" strokeWidth={4} />
            <span className="font-bold">
              &gt; INFO:{" "}
              <span className="font-sans normal-case">{info}</span>
            </span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 border-4 border-foreground bg-accent px-5 py-4 text-sm font-black uppercase tracking-widest text-accent-fg shadow-[6px_6px_0_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0_0_#000] disabled:cursor-wait disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" strokeWidth={4} />
              {isLogin ? "AUTENTICANDO..." : "CRIANDO_CONTA..."}
            </>
          ) : (
            <>
              {isLogin ? "> ENTRAR" : "> CRIAR_CONTA"}
              <ArrowRight className="size-5" strokeWidth={4} />
            </>
          )}
        </button>
      </form>

      <footer className="mt-6 border-t-4 border-foreground pt-5 text-center text-xs uppercase tracking-widest text-muted">
        {isLogin ? (
          <>
            Sem conta?{" "}
            <Link
              href="/auth/signup"
              className="text-accent font-bold underline-offset-4 hover:underline"
            >
              &gt; CADASTRAR
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link
              href="/auth/login"
              className="text-accent font-bold underline-offset-4 hover:underline"
            >
              &gt; ENTRAR
            </Link>
          </>
        )}
      </footer>
    </section>
  );
}

function Field({
  id,
  type = "text",
  label,
  icon,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  disabled,
}: {
  id: string;
  type?: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted"
      >
        {icon}
        <span className="font-bold text-foreground">{label}</span>
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        disabled={disabled}
        className="w-full border-4 border-foreground bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}

function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou senha incorretos.";
  if (m.includes("email not confirmed"))
    return "Email não confirmado. Verifique sua caixa de entrada.";
  if (m.includes("user already registered")) return "Email já cadastrado.";
  if (m.includes("password should be at least"))
    return "Senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  return message;
}
