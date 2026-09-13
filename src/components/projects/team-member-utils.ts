import {
  Crown,
  GraduationCap,
  BookOpen,
  Cpu,
  Sparkles,
  Award,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import type { ProjectMemberRole } from "@/types/database";

export interface RoleBadgeStyle {
  badgeVariant:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline"
    | "teal"
    | "sky"
    | "amber"
    | "emerald"
    | "violet";
  avatarBg: string;
  avatarText: string;
  avatarBorder: string;
  icon: LucideIcon;
  iconColor: string;
  cardBorder: string;
  cardBgTint: string;
  accentText: string;
  accentBg: string;
}

export function getRoleBadgeColor(role: ProjectMemberRole): RoleBadgeStyle {
  switch (role) {
    case "PROJECT_LEAD":
      return {
        badgeVariant: "amber",
        avatarBg: "bg-gradient-to-br from-amber-100 to-amber-200/70 dark:from-amber-950/90 dark:to-amber-900/50",
        avatarText: "text-amber-900 dark:text-amber-200",
        avatarBorder: "border-amber-300/90 dark:border-amber-700/80",
        icon: Crown,
        iconColor: "text-amber-600 dark:text-amber-400",
        cardBorder: "border-amber-400/50 dark:border-amber-600/50 hover:border-amber-500 dark:hover:border-amber-400",
        cardBgTint: "bg-gradient-to-b from-amber-500/[0.04] via-card to-card",
        accentText: "text-amber-700 dark:text-amber-400",
        accentBg: "bg-amber-500/10 dark:bg-amber-500/20",
      };
    case "FACULTY":
      return {
        badgeVariant: "violet",
        avatarBg: "bg-gradient-to-br from-violet-100 to-violet-200/70 dark:from-violet-950/90 dark:to-violet-900/50",
        avatarText: "text-violet-900 dark:text-violet-200",
        avatarBorder: "border-violet-300/90 dark:border-violet-700/80",
        icon: GraduationCap,
        iconColor: "text-violet-600 dark:text-violet-400",
        cardBorder: "border-border/80 hover:border-violet-400/60 dark:hover:border-violet-500/60",
        cardBgTint: "bg-gradient-to-b from-violet-500/[0.02] via-card to-card",
        accentText: "text-violet-700 dark:text-violet-400",
        accentBg: "bg-violet-500/10 dark:bg-violet-500/20",
      };
    case "RESEARCHER":
      return {
        badgeVariant: "sky",
        avatarBg: "bg-gradient-to-br from-sky-100 to-sky-200/70 dark:from-sky-950/90 dark:to-sky-900/50",
        avatarText: "text-sky-900 dark:text-sky-200",
        avatarBorder: "border-sky-300/90 dark:border-sky-700/80",
        icon: BookOpen,
        iconColor: "text-sky-600 dark:text-sky-400",
        cardBorder: "border-border/80 hover:border-sky-400/60 dark:hover:border-sky-500/60",
        cardBgTint: "bg-gradient-to-b from-sky-500/[0.02] via-card to-card",
        accentText: "text-sky-700 dark:text-sky-400",
        accentBg: "bg-sky-500/10 dark:bg-sky-500/20",
      };
    case "STUDENT":
      return {
        badgeVariant: "teal",
        avatarBg: "bg-gradient-to-br from-teal-100 to-teal-200/70 dark:from-teal-950/90 dark:to-teal-900/50",
        avatarText: "text-teal-900 dark:text-teal-200",
        avatarBorder: "border-teal-300/90 dark:border-teal-700/80",
        icon: GraduationCap,
        iconColor: "text-teal-600 dark:text-teal-400",
        cardBorder: "border-border/80 hover:border-teal-400/60 dark:hover:border-teal-500/60",
        cardBgTint: "bg-gradient-to-b from-teal-500/[0.02] via-card to-card",
        accentText: "text-teal-700 dark:text-teal-400",
        accentBg: "bg-teal-500/10 dark:bg-teal-500/20",
      };
    case "ENGINEER":
    case "TECHNICAL_MEMBER":
      return {
        badgeVariant: "info",
        avatarBg: "bg-gradient-to-br from-cyan-100 to-cyan-200/70 dark:from-cyan-950/90 dark:to-cyan-900/50",
        avatarText: "text-cyan-900 dark:text-cyan-200",
        avatarBorder: "border-cyan-300/90 dark:border-cyan-700/80",
        icon: Cpu,
        iconColor: "text-cyan-600 dark:text-cyan-400",
        cardBorder: "border-border/80 hover:border-cyan-400/60 dark:hover:border-cyan-500/60",
        cardBgTint: "bg-gradient-to-b from-cyan-500/[0.02] via-card to-card",
        accentText: "text-cyan-700 dark:text-cyan-400",
        accentBg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      };
    case "DATA_SCIENTIST":
      return {
        badgeVariant: "violet",
        avatarBg: "bg-gradient-to-br from-purple-100 to-fuchsia-200/70 dark:from-purple-950/90 dark:to-fuchsia-900/50",
        avatarText: "text-purple-900 dark:text-purple-200",
        avatarBorder: "border-purple-300/90 dark:border-purple-700/80",
        icon: Sparkles,
        iconColor: "text-purple-600 dark:text-purple-400",
        cardBorder: "border-border/80 hover:border-purple-400/60 dark:hover:border-purple-500/60",
        cardBgTint: "bg-gradient-to-b from-purple-500/[0.02] via-card to-card",
        accentText: "text-purple-700 dark:text-purple-400",
        accentBg: "bg-purple-500/10 dark:bg-purple-500/20",
      };
    case "DOMAIN_EXPERT":
      return {
        badgeVariant: "emerald",
        avatarBg: "bg-gradient-to-br from-emerald-100 to-emerald-200/70 dark:from-emerald-950/90 dark:to-emerald-900/50",
        avatarText: "text-emerald-900 dark:text-emerald-200",
        avatarBorder: "border-emerald-300/90 dark:border-emerald-700/80",
        icon: Award,
        iconColor: "text-emerald-600 dark:text-emerald-400",
        cardBorder: "border-border/80 hover:border-emerald-400/60 dark:hover:border-emerald-500/60",
        cardBgTint: "bg-gradient-to-b from-emerald-500/[0.02] via-card to-card",
        accentText: "text-emerald-700 dark:text-emerald-400",
        accentBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      };
    default:
      return {
        badgeVariant: "default",
        avatarBg: "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900",
        avatarText: "text-slate-800 dark:text-slate-200",
        avatarBorder: "border-slate-300 dark:border-slate-700",
        icon: Briefcase,
        iconColor: "text-slate-600 dark:text-slate-400",
        cardBorder: "border-border/80 hover:border-border",
        cardBgTint: "bg-card",
        accentText: "text-muted-foreground",
        accentBg: "bg-muted/50",
      };
  }
}
