import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-md border-[1.5px] border-input bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-aqua focus-visible:ring-4 focus-visible:ring-aqua/15 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
