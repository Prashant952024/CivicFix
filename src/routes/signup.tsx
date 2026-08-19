import { SignUp } from "@clerk/react";

import { AuthFrame } from "@/routes/auth-frame";

export function SignupPage() {
  return (
      <AuthFrame
      eyebrow="Create a civic account"
      title="Start reporting with CivicFix"
      description="Create your Clerk account, then choose the CivicFix workspace you want to continue to."
      primaryCta={{ label: "Already have an account?", href: "/login" }}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Public signup</p>
          <p className="text-sm text-muted-foreground">
            Clerk will handle authentication, then CivicFix will send you into the secure onboarding flow.
          </p>
        </div>

        <SignUp
          forceRedirectUrl="/app/role-selection"
          path="/signup"
          routing="path"
          signInUrl="/login"
        />
      </div>
    </AuthFrame>
  );
}
