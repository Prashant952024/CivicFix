import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Crown,
  HardHat,
  Loader2,
  ShieldCheck,
  LogOut,
  UsersRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/react";

import { useAppSession } from "@/auth/app-session";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { getCivicFixDashboardPath, type CivicFixRoleCode } from "@/lib/civicfix";

type RoleCard = {
  code: CivicFixRoleCode;
  title: string;
  description: string;
  icon: typeof UsersRound;
  tone: "success" | "info" | "warning" | "danger";
};

const roleCards: RoleCard[] = [
  {
    code: "CITIZEN",
    title: "Citizen",
    description: "Report and track civic issues",
    icon: UsersRound,
    tone: "success",
  },
  {
    code: "MUNICIPAL_OFFICER",
    title: "Municipal Officer",
    description: "Review, verify and manage civic issues",
    icon: Building2,
    tone: "info",
  },
  {
    code: "FIELD_WORKER",
    title: "Field Worker",
    description: "Manage assigned field work and resolutions",
    icon: HardHat,
    tone: "warning",
  },
  {
    code: "ADMIN",
    title: "Admin",
    description: "Manage CivicFix platform operations",
    icon: Crown,
    tone: "danger",
  },
];

function toneClasses(tone: RoleCard["tone"], selected: boolean) {
  if (selected) {
    return "border-primary/50 bg-primary/10 shadow-lg shadow-black/20";
  }

  switch (tone) {
    case "success":
      return "border-emerald-500/15 bg-surface-elevated/80 hover:border-emerald-500/30";
    case "info":
      return "border-blue-500/15 bg-surface-elevated/80 hover:border-blue-500/30";
    case "warning":
      return "border-amber-500/15 bg-surface-elevated/80 hover:border-amber-500/30";
    case "danger":
      return "border-red-500/15 bg-surface-elevated/80 hover:border-red-500/30";
    default:
      return "border-border/70 bg-surface-elevated/80 hover:border-border";
  }
}

function toneChipClasses(tone: RoleCard["tone"], selected: boolean) {
  if (selected) {
    return "border-primary/40 bg-primary/15 text-primary";
  }

  switch (tone) {
    case "success":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "info":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";
    case "warning":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "danger":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    default:
      return "border-border/70 bg-background/40 text-muted-foreground";
  }
}

function displayNameFromClerk(user: ReturnType<typeof useUser>["user"]) {
  return (
    user?.fullName?.trim() ||
    [user?.firstName?.trim(), user?.lastName?.trim()].filter(Boolean).join(" ") ||
    user?.username?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "CivicFix User"
  );
}

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { user } = useUser();
  const { profile, roleCode, status, error } = useAppSession();
  const [manualSelection, setManualSelection] = useState<CivicFixRoleCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const selectedRole = manualSelection ?? (profile && roleCode ? roleCode : "CITIZEN");

  const selectedCard = useMemo(
    () => roleCards.find((card) => card.code === selectedRole) ?? roleCards[0],
    [selectedRole],
  );

  const hasProfile = Boolean(profile && roleCode);

  function handleContinue() {
    if (submitting || status !== "ready") {
      return;
    }

    setSubmitting(true);
    setActionError(null);

    if (!hasProfile) {
      if (selectedRole === "CITIZEN") {
        void navigate("/app/onboarding", { replace: true });
        setSubmitting(false);
        return;
      }

      setActionError(
        "This account is not provisioned for the selected role. Please select Citizen or sign in with the appropriate provisioned account.",
      );
      setSubmitting(false);
      return;
    }

    if (selectedRole !== roleCode) {
      setActionError(
        "This account is not provisioned for the selected role. Please select your assigned role or sign in with the appropriate account.",
      );
      setSubmitting(false);
      return;
    }

    void navigate(getCivicFixDashboardPath(roleCode), { replace: true });
    setSubmitting(false);
  }

  if (!user || status === "syncing" || status === "resolving" || status === "idle") {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-6xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/80 bg-surface/90 px-5 py-4 text-sm text-muted-foreground shadow-sm shadow-black/20">
          Loading your CivicFix account...
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-6xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-4 rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Unable to load role selection</h1>
            <p className="text-sm leading-6 text-muted-foreground">{error ?? "We could not resolve your CivicFix profile."}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/login">Back to login</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void clerk.signOut({ redirectUrl: "/" });
              }}
              type="button"
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-81px)] w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <BrandMark />

      <section className="overflow-hidden rounded-[2rem] border border-border/80 bg-surface/90 shadow-2xl shadow-black/20">
        <div className="border-b border-border/70 bg-gradient-to-r from-background/30 to-background/5 px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Login step
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Choose your CivicFix role
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Select the workspace you want to continue to.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signed in as</p>
              <p className="mt-2 font-medium text-foreground">{displayNameFromClerk(user)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{user.primaryEmailAddress?.emailAddress ?? "Clerk account"}</p>
            </div>
          </div>
        </div>

        {(actionError || error) && (
          <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-medium text-red-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{actionError ?? error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4 sm:p-8">
          {roleCards.map((card) => {
            const selected = selectedRole === card.code;
            const Icon = card.icon;

            return (
              <button
                key={card.code}
                type="button"
                onClick={() => {
                  setManualSelection(card.code);
                  setActionError(null);
                }}
                className={[
                  "group flex h-full flex-col rounded-[1.5rem] border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  toneClasses(card.tone, selected),
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/40 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneChipClasses(card.tone, selected)}`}>
                    {selected ? "Selected" : "Choose"}
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-semibold text-foreground">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Selected role</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{selectedCard.title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {selectedCard.description}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasProfile
              ? "Your Supabase profile is the source of truth. Continue only if the selected role matches your assigned CivicFix role."
              : "This account does not yet have a CivicFix profile. Citizen can continue to onboarding; privileged roles must be provisioned before access."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              void clerk.signOut({ redirectUrl: "/" });
            }}
            type="button"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
          <Button
            disabled={submitting}
            onClick={() => {
              void handleContinue();
            }}
            type="button"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Continue
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </section>

      {!hasProfile ? (
        <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-sm shadow-black/10">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Provisioning note</p>
              <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                Citizen accounts can continue into onboarding. Municipal Officer, Field Worker, and Admin accounts must
                already exist in Supabase before they can access their dashboards.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
