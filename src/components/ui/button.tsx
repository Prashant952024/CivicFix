import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const buttonBaseClassName =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] select-none touch-manipulation cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const buttonVariantClassNames = {
  default:
    "bg-gradient-to-r from-[#0f766e] via-[#0284c7] to-[#059669] text-primary-foreground shadow-md shadow-teal-950/15 hover:from-[#0b6159] hover:via-[#0369a1] hover:to-[#047857] hover:shadow-lg hover:shadow-teal-950/20",
  destructive:
    "bg-gradient-to-r from-[#e11d48] to-[#dc2626] text-white shadow-sm shadow-red-950/15 hover:from-[#be123c] hover:to-[#b91c1c] hover:shadow-md hover:shadow-red-950/20",
  outline:
    "border border-border bg-surface text-foreground shadow-sm shadow-black/5 hover:border-teal-200 hover:bg-teal-50/85 hover:text-teal-800",
  secondary: "bg-secondary text-secondary-foreground shadow-sm shadow-black/5 hover:bg-secondary/80",
  ghost: "hover:bg-muted/65 hover:text-foreground",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

const buttonSizeClassNames = {
  xs: "h-8 rounded-lg px-2.5 text-xs",
  sm: "h-10 rounded-xl px-3 text-xs sm:text-sm",
  default: "h-11 px-4 py-2.5 text-sm",
  lg: "h-12 rounded-xl px-6 sm:px-8 text-base font-semibold",
  icon: "h-11 w-11",
  "icon-sm": "h-9 w-9 rounded-lg",
  "icon-lg": "h-12 w-12 rounded-xl",
} as const;

type ButtonVariant = keyof typeof buttonVariantClassNames;
type ButtonSize = keyof typeof buttonSizeClassNames;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const variantClassName = buttonVariantClassNames[variant ?? "default"];
    const sizeClassName = buttonSizeClassNames[size ?? "default"];

    return <Comp className={cn(buttonBaseClassName, variantClassName, sizeClassName, className)} ref={ref} {...props} />;
  },
);

Button.displayName = "Button";

export { Button };

