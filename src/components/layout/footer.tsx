export function Footer() {
  return (
    <footer className="border-t border-border/80 bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>CivicFix helps cities move from report to verification with a cleaner civic workflow.</p>
        <p className="uppercase tracking-[0.24em]">React · Clerk · Supabase</p>
      </div>
    </footer>
  );
}
