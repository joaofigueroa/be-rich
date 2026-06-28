"use client";

import { Button } from "@be-rich/ui/button";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reprocessCategoriesAction } from "@/app/classification-actions";

export function ReprocessCategoriesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function submit() {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      try {
        const result = await reprocessCategoriesAction();
        setMessage(result.message);
        router.refresh();
      } catch (error) {
        setIsError(true);
        setMessage(
          error instanceof Error ? error.message : "Não foi possível iniciar a reclassificação.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="outline" disabled={isPending} onClick={submit}>
        <Sparkles className="size-4" />
        {isPending ? "Reclassificando…" : "Categorizar pendentes"}
      </Button>
      {message ? (
        <p
          className={`max-w-xs text-right text-xs ${isError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
