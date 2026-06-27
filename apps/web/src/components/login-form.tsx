"use client";

import { Button } from "@be-rich/ui/button";
import { Input } from "@be-rich/ui/input";
import { Label } from "@be-rich/ui/label";
import { ArrowRight, CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard",
      newUserCallbackURL: "/dashboard",
    });
    if (result.error) {
      setMessage(result.error.message ?? "Não foi possível enviar o link.");
      setState("error");
      return;
    }
    setState("sent");
  }

  if (state === "sent")
    return (
      <div className="mt-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5">
        <CheckCircle2 className="size-6 text-emerald-600" />
        <h2 className="mt-4 font-semibold">Confira sua caixa de entrada</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Enviamos o link para <strong className="text-foreground">{email}</strong>.
        </p>
        <Button className="mt-4" variant="ghost" onClick={() => setState("idle")}>
          Usar outro e-mail
        </Button>
      </div>
    );

  return (
    <form className="mt-8 space-y-4" onSubmit={submit}>
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
      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <Button size="lg" className="w-full" disabled={state === "loading"}>
        {state === "loading" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <>
            Enviar link seguro <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}
