import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-aqua/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground disabled:shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-aqua-2 to-sea text-abyss font-extrabold shadow-btn hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
        outline: "border-[1.5px] border-sea bg-card text-sea font-bold hover:bg-info-bg",
        secondary: "border-[1.5px] border-sea bg-card text-sea font-bold hover:bg-info-bg",
        subtle: "bg-info-bg text-sea font-bold hover:bg-info-bg/70",
        ghost: "text-muted-foreground font-bold hover:bg-secondary hover:text-foreground",
        success: "bg-success text-white font-bold hover:bg-success/90",
        destructive: "bg-danger text-white font-bold hover:bg-danger/90"
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-[52px] px-6 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
