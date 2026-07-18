import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-info-bg text-info",
        neutral: "border-border bg-secondary text-muted-foreground",
        success: "border-transparent bg-success-bg text-success",
        warning: "border-transparent bg-warning-bg text-warning",
        danger: "border-transparent bg-danger-bg text-danger",
        info: "border-transparent bg-info-bg text-info",
        course: "border-transparent bg-course-bg text-course"
      }
    },
    defaultVariants: { variant: "default" }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
