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
    description: "Review, verify and route civic issues to departments",
    icon: Building2,
    tone: "info",
  },
  {
    code: "DEPARTMENT_MANAGER",
    title: "Department Manager",
    description: "Manage departmental tasks and dispatch field workers",
    icon: ShieldCheck,
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
    return "border-primary/40 bg-[linear-gradient(135deg,rgba(15,118,110,0.12)_0%,rgba(2,132,199,0.10)_52%,rgba(5,150,105,0.12)_100%)] shadow-xl shadow-teal-950/15 ring-1 ring-teal-200/80";
  }

  switch (tone) {
    case "success":
      return "border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.95)_0%,rgba(224,253,242,0.85)_100%)] hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-950/10";
    case "info":
      return "border-sky-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.95)_0%,rgba(224,242,254,0.85)_100%)] hover:border-sky-300 hover:shadow-lg hover:shadow-sky-950/10";
    case "warning":
      return "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.95)_0%,rgba(254,243,199,0.85)_100%)] hover:border-amber-300 hover:shadow-lg hover:shadow-amber-950/10";
    case "danger":
      return "border-purple-200 bg-[linear-gradient(180deg,rgba(250,245,255,0.95)_0%,rgba(243,232,255,0.85)_100%)] hover:border-purple-300 hover:shadow-lg hover:shadow-purple-950/10";
    default:
      return "border-border/70 bg-[linear-gradient(180deg,rgba(244,248,246,0.96)_0%,rgba(232,243,238,0.88)_100%)] hover:border-border hover:shadow-lg hover:shadow-teal-950/8";
  }
}

function toneChipClasses(tone: RoleCard["tone"], selected: boolean) {
  if (selected) {
    return "border-primary/40 bg-white/70 text-[#0f5f59]";
  }

  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "danger":
      return "border-purple-200 bg-purple-50 text-purple-700";
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

  if (!user || status === "syncing" || status === "idle") {
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700">
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

      <section className="overflow-hidden rounded-[2rem] border border-teal-100/80 bg-[linear-gradient(180deg,rgba(251,253,252,0.94)_0%,rgba(237,245,243,0.9)_100%)] shadow-2xl shadow-teal-950/12">
        <div className="border-b border-teal-100/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.10)_0%,rgba(2,132,199,0.08)_52%,rgba(124,58,237,0.08)_100%)] px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-teal-200/80 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#0f5f59] shadow-sm shadow-teal-950/5">
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

            <div className="rounded-2xl border border-border/70 bg-white/65 px-4 py-3 text-sm text-muted-foreground shadow-sm shadow-black/5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signed in as</p>
              <p className="mt-2 font-medium text-foreground">{displayNameFromClerk(user)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{user.primaryEmailAddress?.emailAddress ?? "Clerk account"}</p>
            </div>
          </div>
        </div>

        {(actionError || error) && (
          <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm font-medium text-red-800">
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
            const iconTone =
              card.tone === "success"
                ? "bg-emerald-100 text-emerald-700"
                : card.tone === "info"
                  ? "bg-sky-100 text-sky-700"
                  : card.tone === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-purple-100 text-purple-700";

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
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 ${iconTone} shadow-sm`}>
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

      <section className="grid gap-4 rounded-[1.75rem] border border-border/80 bg-[linear-gradient(135deg,rgba(15,118,110,0.10)_0%,rgba(2,132,199,0.08)_52%,rgba(124,58,237,0.08)_100%)] p-6 shadow-lg shadow-teal-950/10 lg:grid-cols-[1fr_auto] lg:items-center">
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
        <section className="rounded-[1.75rem] border border-border/80 bg-white/80 p-6 shadow-sm shadow-black/10">
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
