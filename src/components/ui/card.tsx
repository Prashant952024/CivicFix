import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?:
      | "default"
      | "civic"
      | "innovation"
      | "research"
      | "attention"
      | "critical"
      | "elevated"
      | "gradient"
      | "glass"
      | "subtle"
      | "danger"
      | "warning"
      | "success";
    interactive?: boolean;
  }
>(({ className, variant = "default", interactive = false, ...props }, ref) => {
  const variantClasses = {
    default: "border border-border/80 bg-surface/90 shadow-sm shadow-teal-950/5",
    civic: "border border-teal-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(240,253,250,0.7)_100%)] shadow-sm shadow-teal-950/5",
    innovation: "border border-indigo-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(238,242,255,0.7)_100%)] shadow-sm shadow-indigo-950/5",
    research: "border border-sky-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(240,249,255,0.7)_100%)] shadow-sm shadow-sky-950/5",
    attention: "border border-amber-200 bg-amber-50/70 text-amber-950",
    critical: "border border-rose-200 bg-rose-50/70 text-rose-950",
    elevated: "border border-border/80 bg-surface-elevated shadow-md shadow-teal-950/8",
    gradient: "border border-teal-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(239,246,244,0.92)_100%)] shadow-lg shadow-teal-950/10",
    glass: "border border-teal-100/70 bg-white/80 backdrop-blur-md shadow-lg shadow-teal-950/8",
    subtle: "border border-border/60 bg-background/50",
    danger: "border border-rose-200 bg-rose-50/70 text-rose-900",
    warning: "border border-amber-200 bg-amber-50/70 text-amber-900",
    success: "border border-emerald-200 bg-emerald-50/70 text-emerald-900",
  }[variant];

  const interactiveClasses = interactive
    ? "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-950/8 hover:border-teal-200/80 active:translate-y-0 active:scale-[0.99] cursor-pointer"
    : "";

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-[1.6rem] text-card-foreground",
        variantClasses,
        interactiveClasses,
        className
      )}
      {...props}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base sm:text-lg font-semibold leading-snug tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs sm:text-sm leading-relaxed text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 sm:p-6 pt-0 sm:pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 sm:p-6 pt-0 sm:pt-0 gap-3", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
