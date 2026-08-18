import { useCallback, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/react";

import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type CivicFixProfileSyncStatus = "idle" | "syncing" | "ready" | "error";

type SyncResult = {
  profile: ProfileRow | null;
  error: string | null;
  status: CivicFixProfileSyncStatus;
};

const PROFILE_SELECT = "id, clerk_user_id, full_name, email, phone, role_id, department_id, created_at, updated_at";

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

async function loadCitizenRoleId() {
  const { data, error } = await supabase.from("roles").select("id, code").eq("code", "CITIZEN").maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("CITIZEN role seed data is missing.");
  }

  return data.id;
}

async function loadCurrentProfile(clerkUserId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function useCivicFixProfileSync(): SyncResult & { refresh: () => Promise<void> } {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [status, setStatus] = useState<CivicFixProfileSyncStatus>("idle");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId) {
      setProfile(null);
      setError(null);
      setStatus("idle");
      return;
    }

    setStatus("syncing");
    setError(null);

    try {
      const currentProfile = await loadCurrentProfile(userId);
      const nextFullName = displayNameFromClerkUser(user);
      const nextEmail = user?.primaryEmailAddress?.emailAddress ?? currentProfile?.email ?? null;

      if (!currentProfile) {
        const citizenRoleId = await loadCitizenRoleId();
        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert({
            clerk_user_id: userId,
            full_name: nextFullName,
            email: nextEmail,
            phone: null,
            role_id: citizenRoleId,
            department_id: null,
          })
          .select(PROFILE_SELECT)
          .single();

        if (insertError) {
          if (insertError.code === "23505") {
            const retryProfile = await loadCurrentProfile(userId);
            if (!retryProfile) {
              throw new Error("Profile already exists, but it could not be loaded again.");
            }
            setProfile(retryProfile);
            setStatus("ready");
            return;
          }

          throw insertError;
        }

        setProfile(inserted);
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

        setProfile(updated ?? currentProfile);
      } else {
        setProfile(currentProfile);
      }

      setStatus("ready");
    } catch (syncError) {
      setError(safeErrorMessage(syncError));
      setStatus("error");
    }
  }, [
    isLoaded,
    isSignedIn,
    user,
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

  return { profile, error, status, refresh: syncProfile };
}
