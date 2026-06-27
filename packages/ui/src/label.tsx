import type * as React from "react";
import { cn } from "./utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  // biome-ignore lint/a11y/noLabelWithoutControl: association is supplied by callers through htmlFor.
  return <label className={cn("text-sm font-medium leading-none", className)} {...props} />;
}
