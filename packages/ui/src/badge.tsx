import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "./utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary/12 text-primary",
      secondary: "bg-secondary text-secondary-foreground",
      outline: "border border-border text-foreground",
      success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
      warning: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
    },
  },
  defaultVariants: { variant: "default" },
});

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
