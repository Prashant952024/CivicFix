import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
  className,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "w-full max-h-[92vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[1.75rem] border border-border/80 bg-surface/98 p-5 sm:p-6 shadow-2xl shadow-slate-950/30 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200",
          maxWidthClasses,
          className
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "dialog-title" : undefined}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
          <div className="space-y-1 min-w-0 flex-1">
            {title ? (
              <h2 id="dialog-title" className="text-xl font-bold tracking-tight text-foreground sm:text-2xl break-words">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <button
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
