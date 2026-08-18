import { SignIn } from "@clerk/react";

import { AuthFrame } from "@/routes/auth-frame";

export function LoginPage() {
  return (
    <AuthFrame
      eyebrow="Secure access"
      title="Sign in to CivicFix"
      description="Continue into your CivicFix workspace with Clerk authentication and your role-aware dashboard."
      primaryCta={{ label: "Need an account?", href: "/signup" }}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Welcome back</p>
          <p className="text-sm text-muted-foreground">
            Use the authentication methods configured in Clerk to continue.
          </p>
        </div>

        <SignIn
          forceRedirectUrl="/app"
          path="/login"
          routing="path"
          signUpUrl="/signup"
        />
      </div>
    </AuthFrame>
  );
}
