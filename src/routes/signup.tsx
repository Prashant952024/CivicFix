import { SignUp } from "@clerk/react";

import { AuthFrame } from "@/routes/auth-frame";

export function SignupPage() {
  return (
    <AuthFrame
      eyebrow="Create a civic account"
      title="Start reporting with CivicFix"
      description="New public users are synced into CivicFix as citizens, with no privileged role selection exposed in the UI."
      primaryCta={{ label: "Already have an account?", href: "/login" }}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Public signup</p>
          <p className="text-sm text-muted-foreground">
            Clerk will handle the account creation, then CivicFix profile sync will assign the Citizen role.
          </p>
        </div>

        <SignUp
          forceRedirectUrl="/app"
          path="/signup"
          routing="path"
          signInUrl="/login"
        />
      </div>
    </AuthFrame>
  );
}
