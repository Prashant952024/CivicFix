import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type IssueImageVariant = "thumbnail" | "card" | "hero" | "detail" | "preview";

type IssueImageProps = {
  alt: string;
  src: string | null | undefined;
  variant?: IssueImageVariant;
  className?: string;
  imageClassName?: string;
  emptyLabel?: string;
  brokenLabel?: string;
};

const VARIANT_STYLES: Record<
  IssueImageVariant,
  {
    frame: string;
    image: string;
    fallback: string;
    skeleton: string;
    labelSize: string;
  }
> = {
  thumbnail: {
    frame: "relative aspect-[4/3] overflow-hidden bg-surface-elevated",
    image: "h-full w-full object-cover",
    fallback: "aspect-[4/3]",
    skeleton: "aspect-[4/3]",
    labelSize: "text-[11px]",
  },
  card: {
    frame: "relative aspect-[16/10] overflow-hidden bg-surface-elevated",
    image: "h-full w-full object-cover",
    fallback: "aspect-[16/10]",
    skeleton: "aspect-[16/10]",
    labelSize: "text-[11px]",
  },
  hero: {
    frame: "relative flex min-h-[18rem] max-h-[32rem] items-center justify-center overflow-hidden bg-surface-elevated",
    image: "max-h-[32rem] w-full object-contain",
    fallback: "min-h-[18rem] max-h-[32rem]",
    skeleton: "min-h-[18rem] max-h-[32rem]",
    labelSize: "text-xs",
  },
  detail: {
    frame: "relative flex min-h-[14rem] max-h-[70vh] items-center justify-center overflow-hidden bg-surface-elevated",
    image: "max-h-[70vh] w-full object-contain",
    fallback: "min-h-[14rem] max-h-[70vh]",
    skeleton: "min-h-[14rem] max-h-[70vh]",
    labelSize: "text-xs",
  },
  preview: {
    frame: "relative flex min-h-[12rem] max-h-64 items-center justify-center overflow-hidden bg-surface-elevated",
    image: "max-h-64 w-full object-contain",
    fallback: "min-h-[12rem] max-h-64",
    skeleton: "min-h-[12rem] max-h-64",
    labelSize: "text-[11px]",
  },
};

export function IssueImage({
  alt,
  src,
  variant = "detail",
  className,
  imageClassName,
  emptyLabel = "No image available",
  brokenLabel = "Image could not be loaded",
}: IssueImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);

  const styles = VARIANT_STYLES[variant];
  const frameClassName = cn(styles.frame, className);
  const isLoaded = src != null && loadedSrc === src;
  const isBroken = src != null && brokenSrc === src;

  if (!src || isBroken) {
    return (
      <div className={cn(frameClassName, styles.fallback)}>
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-background p-4 text-center">
          <div className="max-w-[16rem] rounded-2xl border border-border/70 bg-background/50 px-4 py-3">
            <ImageIcon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
            <p className={cn("mt-2 font-semibold uppercase tracking-[0.22em] text-muted-foreground", styles.labelSize)}>
              {isBroken ? brokenLabel : emptyLabel}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={frameClassName} aria-busy={!isLoaded}>
      {!isLoaded ? (
        <div
          className={cn(
            "absolute inset-0 animate-pulse bg-[linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))]",
            styles.skeleton,
          )}
        />
      ) : null}
      <img
        alt={alt}
        className={cn("relative z-10 transition-opacity duration-300", styles.image, !isLoaded && "opacity-0", imageClassName)}
        decoding="async"
        loading="lazy"
        onError={() => setBrokenSrc(src)}
        onLoad={() => setLoadedSrc(src)}
        src={src}
      />
    </div>
  );
}
