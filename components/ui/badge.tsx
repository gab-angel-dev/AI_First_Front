import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5",
    "text-[11px] font-semibold leading-none",
    "border transition-colors duration-150",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    "select-none whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary/10 text-primary border-primary/20",
          "dark:bg-primary/20",
        ].join(" "),
        secondary: [
          "bg-secondary/15 text-secondary border-secondary/25",
          "dark:bg-secondary/25",
        ].join(" "),
        destructive: [
          "bg-destructive/10 text-destructive border-destructive/20",
        ].join(" "),
        outline: [
          "text-foreground border-border bg-background",
        ].join(" "),
        success: [
          "bg-[hsl(var(--success))/0.1] text-[hsl(var(--success))] border-[hsl(var(--success))/0.25]",
        ].join(" "),
        warning: [
          "bg-[hsl(var(--warning))/0.12] text-[hsl(var(--warning))] border-[hsl(var(--warning))/0.25]",
        ].join(" "),
        solid: [
          "bg-primary text-primary-foreground border-transparent",
        ].join(" "),
      },
      size: {
        default: "px-2.5 py-0.5 text-[11px]",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full inline-block shrink-0",
            variant === "destructive" && "bg-destructive",
            variant === "success" && "bg-[hsl(var(--success))]",
            variant === "default" && "bg-primary",
            variant === "secondary" && "bg-secondary",
            (!variant || variant === "outline") && "bg-muted-foreground"
          )}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };