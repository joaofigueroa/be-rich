"use client";

import { Button } from "@be-rich/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@be-rich/ui/dialog";
import { Input } from "@be-rich/ui/input";
import { Label } from "@be-rich/ui/label";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { createFinancialAccountAction } from "@/app/actions";

const ACCOUNT_TYPES = [
  ["CHECKING", "Conta corrente"],
  ["SAVINGS", "Poupança"],
  ["PAYMENT", "Conta de pagamento"],
  ["INVESTMENT", "Investimentos / caixinha"],
  ["CASH", "Dinheiro em espécie"],
  ["DEBT", "Dívida"],
] as const;

export function AccountCreateDialog({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await createFinancialAccountAction(form);
        setOpen(false);
        router.refresh();
      } catch (createError) {
        setError(
          createError instanceof Error ? createError.message : "Não foi possível criar a conta.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          <Plus className="size-4" /> Nova conta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar conta</DialogTitle>
          <DialogDescription>
            Adicione uma conta para centralizar saldos, extratos, faturas e patrimônio.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submitAccount}>
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="currency" value="BRL" />
          <div className="space-y-2">
            <Label htmlFor="dashboard-account-name">Nome</Label>
            <Input
              id="dashboard-account-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="Ex.: Nubank pessoal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dashboard-account-type">Tipo da conta</Label>
            <select
              id="dashboard-account-type"
              name="type"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue="CHECKING"
            >
              {ACCOUNT_TYPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando…" : "Criar conta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
