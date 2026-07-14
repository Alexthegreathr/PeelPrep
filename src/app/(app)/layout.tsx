import { requireUser, getProfile } from "@/lib/auth/dal";
import { listInterviews } from "@/lib/data/interviews";
import { Sidebar } from "@/components/app/sidebar";
import { MobileNav } from "@/components/app/mobile-nav";
import { Logo } from "@/components/shared/logo";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPalette } from "@/components/app/command-palette";
import { PageTransition } from "@/components/app/page-transition";

/**
 * Authenticated shell. `requireUser()` is the server-side boundary — an
 * unauthenticated request redirects to /login here (proxy already does an
 * optimistic redirect, but this is the real check). Each page and action
 * re-verifies independently; a layout check alone is never sufficient
 * (Next auth guide — layouts don't re-render on every navigation).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [profile, interviews] = await Promise.all([
    getProfile(),
    listInterviews(),
  ]);
  const userLabel = profile?.full_name || user.email || "Your account";
  const paletteInterviews = interviews.map((i) => ({
    id: i.id,
    company_name: i.company_name,
    position_title: i.position_title,
  }));

  return (
    <ToastProvider>
      <CommandPalette interviews={paletteInterviews} />
      <div className="flex min-h-svh">
        <Sidebar userLabel={userLabel} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header (hidden on desktop where the sidebar shows) */}
          <header className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden print:hidden">
            <MobileNav userLabel={userLabel} />
            <Logo href="/dashboard" />
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-5xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
