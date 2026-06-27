"use client";

import { Button } from "@be-rich/ui/button";
import { Input } from "@be-rich/ui/input";
import { Label } from "@be-rich/ui/label";
import { ArrowRight, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de entrar.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
  PASSWORD_TOO_LONG: "A senha deve ter no máximo 128 caracteres.",
  PASSWORD_TOO_SHORT: "A senha deve ter pelo menos 8 caracteres.",
  USER_ALREADY_EXISTS: "Já existe uma conta com este e-mail.",
};

function friendlyError(error: { code?: string; message?: string }) {
  return (
    (error.code && ERROR_MESSAGES[error.code]) || error.message || "Não foi possível continuar."
  );
}

export function LoginForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (mode === "sign-up" && password !== passwordConfirmation) {
      setMessage("As senhas não coincidem.");
      return;
    }

    if (mode === "sign-up" && name.trim().length < 2) {
      setMessage("Informe seu nome.");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              name: name.trim(),
              email,
              password,
              callbackURL: "/dashboard",
            })
          : await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });

      if (result.error) {
        setMessage(friendlyError(result.error));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setMessage("Não foi possível conectar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-4" aria-busy={loading} onSubmit={submit}>
      {mode === "sign-up" ? (
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <div className="relative">
            <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome"
              className="h-12 pl-10"
            />
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@exemplo.com"
            className="h-12 pl-10"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo de 8 caracteres"
            className="h-12 pl-10"
          />
        </div>
      </div>
      {mode === "sign-up" ? (
        <div className="space-y-2">
          <Label htmlFor="password-confirmation">Confirmar senha</Label>
          <div className="relative">
            <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password-confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Digite a senha novamente"
              className="h-12 pl-10"
            />
          </div>
        </div>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <>
            {mode === "sign-up" ? "Criar minha conta" : "Entrar"}
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
