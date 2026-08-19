import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Crown,
  HardHat,
  Loader2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/react";

import { useAppSession } from "@/auth/app-session";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";
import { getCivicFixDashboardPath, loadCivicFixRoleId, type CivicFixRoleCode, civicFixRoleConfigs } from "@/lib/civicfix";
import { supabase } from "@/lib/supabase";

type RoleCard = {
  code: CivicFixRoleCode;
  label: string;
  description: string;
  icon: typeof UsersRound;
  note: string;
  tone: "success" | "info" | "warning" | "danger";
};

const roleCards: RoleCard[] = [
  {
    code: "CITIZEN",
    label: "Citizen",
    description: "Report civic issues, track submitted complaints, and verify resolutions.",
    icon: UsersRound,
    note: "Self-service",
    tone: "success",
  },
  {
    code: "MUNICIPAL_OFFICER",
    label: "Municipal Officer",
    description: "Verify and manage issues, assign departments or workers, and monitor civic operations.",
    icon: ShieldCheck,
    note: "Admin provisioned",
    tone: "info",
  },
  {
    code: "FIELD_WORKER",
    label: "Field Worker",
    description: "View assigned issues, update work progress, and submit resolution evidence.",
    icon: HardHat,
    note: "Admin provisioned",
    tone: "warning",
  },
  {
    code: "ADMIN",
    label: "Admin",
    description: "Manage users and platform operations with the full CivicFix control surface.",
    icon: Crown,
    note: "Admin provisioned",
    tone: "danger",
  },
];

function toneClasses(tone: RoleCard["tone"], selected: boolean) {
  const selectedBase = "border-primary/35 bg-primary/5 shadow-lg shadow-emerald-950/10";

  if (selected) {
    return selectedBase;
  }

  switch (tone) {
    case "success":
      return "border-emerald-200 bg-surface-elevated/80 hover:border-emerald-300";
    case "info":
      return "border-sky-200 bg-surface-elevated/80 hover:border-sky-300";
    case "warning":
      return "border-amber-200 bg-surface-elevated/80 hover:border-amber-300";
    case "danger":
      return "border-red-200 bg-surface-elevated/80 hover:border-red-300";
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
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "danger":
      return "border-red-200 bg-red-50 text-red-700";
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

function safeErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const rawMessage = (error as { message?: unknown }).message;
    if (typeof rawMessage === "string" && rawMessage.trim()) {
      return rawMessage;
    }
  }

  return "We could not complete your CivicFix setup right now.";
}

export function RoleOnboardingPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const { profile, roleCode, status, error, refresh } = useAppSession();
  const [selectedRole, setSelectedRole] = useState<CivicFixRoleCode>("CITIZEN");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "ready" && profile && roleCode) {
      void navigate(getCivicFixDashboardPath(roleCode), { replace: true });
    }
  }, [navigate, profile, roleCode, status]);

  const selectedCard = useMemo(
    () => roleCards.find((card) => card.code === selectedRole) ?? roleCards[0],
    [selectedRole],
  );

  async function handleCreateProfile() {
    if (!isLoaded || !isSignedIn || !userId || submitting) {
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const roleId = await loadCivicFixRoleId(selectedRole);
      if (!roleId) {
        throw new Error("Could not resolve the CivicFix role you selected.");
      }

      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          clerk_user_id: userId,
          full_name: displayNameFromClerk(user),
          email: user?.primaryEmailAddress?.emailAddress ?? null,
          phone: null,
          role_id: roleId,
          department_id: null,
        });

      if (insertError) {
        if (selectedRole !== "CITIZEN") {
          setActionError(
            "This role is protected. Officer, Field Worker, and Admin accounts must be provisioned by a CivicFix administrator before they can sign in.",
          );
        } else {
          setActionError(safeErrorMessage(insertError));
        }
        return;
      }

      await refresh();
      setActionMessage(`${civicFixRoleConfigs[selectedRole].label} profile created successfully.`);
      void navigate(getCivicFixDashboardPath(selectedRole), { replace: true });
    } catch (setupError) {
      if (import.meta.env.DEV) {
        console.error("Role onboarding failed", setupError);
      }

      setActionError(safeErrorMessage(setupError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded || status === "syncing") {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-6xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/80 bg-surface/90 px-5 py-4 text-sm text-muted-foreground shadow-sm shadow-black/20">
          Loading your CivicFix profile...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-6xl place-items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/80 bg-surface/90 px-5 py-4 text-sm text-muted-foreground shadow-sm shadow-black/20">
          Please sign in to continue.
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
                First-time setup
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Choose your CivicFix role
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Citizen profiles can be created immediately. Municipal Officer, Field Worker, and Admin
                  accounts are protected and must already be provisioned in CivicFix before they can sign in.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Signed in as</p>
              <p className="mt-2 font-medium text-foreground">{displayNameFromClerk(user)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress ?? "Clerk account"}</p>
            </div>
          </div>
        </div>

        {(actionMessage || actionError || error) && (
          <div
            className={[
              "border-b px-6 py-4 text-sm font-medium",
              actionError || error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{actionError ?? error ?? actionMessage}</p>
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
                  setSelectedRole(card.code);
                  setActionError(null);
                  setActionMessage(null);
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
                    {selected ? "Selected" : card.note}
                  </span>
                </div>

                <h2 className="mt-5 text-lg font-semibold text-foreground">{civicFixRoleConfigs[card.code].label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>

                <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  {card.note}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-lg shadow-black/20 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">Selected role</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {civicFixRoleConfigs[selectedCard.code].label}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{selectedCard.description}</p>
          <p className="text-sm text-muted-foreground">
            {selectedRole === "CITIZEN"
              ? "This will create your Citizen profile and take you into the citizen dashboard."
              : "This selection will be checked against Supabase RLS. If the role is not already provisioned, CivicFix will keep the account blocked instead of escalating privileges."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
          <Button asChild variant="outline">
            <Link to="/login">Back to login</Link>
          </Button>
          <Button
            disabled={submitting}
            onClick={() => {
              void handleCreateProfile();
            }}
            type="button"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating profile
              </>
            ) : (
              <>
                Create profile
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/80 bg-surface/90 p-6 shadow-sm shadow-black/10">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-border/70 bg-background/40 p-3 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Security note</p>
            <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
              The selected role is only an onboarding input. Actual authorization still comes from the Supabase
              profile row and existing RLS policies, so privileged roles cannot be self-granted from the browser.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
