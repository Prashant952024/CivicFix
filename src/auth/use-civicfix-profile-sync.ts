import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/react";

import { supabase } from "@/lib/supabase";
import type { CivicFixRoleCode } from "@/lib/civicfix";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileWithRoleCode = ProfileRow & {
  role?: {
    code: CivicFixRoleCode;
  } | null;
};

export type CivicFixProfileSyncStatus = "idle" | "syncing" | "ready" | "error";

type SyncResult = {
  profile: ProfileRow | null;
  roleCode: CivicFixRoleCode | null;
  error: string | null;
  status: CivicFixProfileSyncStatus;
};

const PROFILE_SELECT =
  "id, clerk_user_id, full_name, email, phone, role_id, department_id, employee_id, designation, is_active, avatar_url, joined_at, created_at, updated_at, role:roles(code)";

function displayNameFromClerkUser(user: ReturnType<typeof useUser>["user"]) {
  const fullName = user?.fullName?.trim();
  if (fullName) {
    return fullName;
  }

  const parts = [user?.firstName?.trim(), user?.lastName?.trim()].filter((part): part is string => Boolean(part));
  if (parts.length > 0) {
    return parts.join(" ");
  }

  const username = user?.username?.trim();
  if (username) {
    return username;
  }

  return "CivicFix User";
}

function safeErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const rawMessage = (error as { message?: unknown }).message;
    if (typeof rawMessage === "string" && rawMessage.trim()) {
      return rawMessage;
    }
    if (
      typeof rawMessage === "number" ||
      typeof rawMessage === "boolean" ||
      typeof rawMessage === "bigint"
    ) {
      return String(rawMessage);
    }
    if (rawMessage == null) {
      return "";
    }
    return "";
  }

  return "Unknown profile synchronization error.";
}

async function loadCurrentProfile(clerkUserId: string, clerkEmail?: string | null) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as ProfileWithRoleCode | null;
  }

  if (clerkEmail) {
    const normalizedEmail = clerkEmail.trim().toLowerCase();
    const { data: emailMatch, error: emailError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (emailError) {
      throw emailError;
    }

    if (emailMatch) {
      const { data: linkedProfile, error: linkError } = await supabase
        .from("profiles")
        .update({
          clerk_user_id: clerkUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", emailMatch.id)
        .select(PROFILE_SELECT)
        .single();

      if (!linkError && linkedProfile) {
        return linkedProfile as ProfileWithRoleCode;
      }

      return emailMatch as ProfileWithRoleCode;
    }
  }

  return null;
}

export function useCivicFixProfileSync(): SyncResult & { refresh: () => Promise<void> } {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const clerkFullName = displayNameFromClerkUser(user);
  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const clerkFullNameRef = useRef(displayNameFromClerkUser(user));
  const clerkEmailRef = useRef(clerkEmail);
  const [status, setStatus] = useState<CivicFixProfileSyncStatus>("idle");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roleCode, setRoleCode] = useState<CivicFixRoleCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clerkFullNameRef.current = clerkFullName;
    clerkEmailRef.current = clerkEmail;
  }, [clerkEmail, clerkFullName]);

  const syncProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId) {
      setProfile(null);
      setRoleCode(null);
      setError(null);
      setStatus("idle");
      return;
    }

    setStatus("syncing");
    setError(null);

    try {
      const currentProfile = await loadCurrentProfile(userId, clerkEmailRef.current);
      const nextFullName = clerkFullNameRef.current;
      const nextEmail = clerkEmailRef.current ?? currentProfile?.email ?? null;
      const currentRoleCode = currentProfile?.role?.code ?? null;

      if (!currentProfile) {
        setProfile(null);
        setRoleCode(null);
        setStatus("ready");
        return;
      }

      const shouldUpdate = currentProfile.full_name !== nextFullName || currentProfile.email !== nextEmail;
      if (shouldUpdate) {
        const { data: updated, error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: nextFullName,
            email: nextEmail,
          })
          .eq("id", currentProfile.id)
          .select(PROFILE_SELECT)
          .single();

        if (updateError) {
          throw updateError;
        }

        const nextProfile = (updated as ProfileWithRoleCode | null) ?? currentProfile;
        setProfile(nextProfile);
        setRoleCode(nextProfile.role?.code ?? currentRoleCode);
      } else {
        setProfile(currentProfile);
        setRoleCode(currentRoleCode);
      }

      setStatus("ready");
    } catch (syncError) {
      setError(safeErrorMessage(syncError));
      setRoleCode(null);
      setStatus("error");
    }
  }, [
    isLoaded,
    isSignedIn,
    userId,
  ]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void syncProfile();
      }
    });

    return () => {
      cancelled = true;
    };
    // Keeping the sync keyed only to the Clerk identity avoids repeated inserts
    // while still refreshing if the active Clerk user changes.
  }, [syncProfile]);

  return { profile, roleCode, error, status, refresh: syncProfile };
}
