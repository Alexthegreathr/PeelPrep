import { Logo } from "@/components/shared/logo";
import { NavLink } from "@/components/app/nav-link";
import { SignOutButton } from "@/components/app/sign-out-button";
import { NAV_ITEMS } from "@/components/app/nav-items";
import { CommandTrigger } from "@/components/app/command-palette";

/**
 * Desktop sidebar (hidden below `lg`). The mobile equivalent lives in
 * MobileNav as a slide-in sheet.
 */
export function Sidebar({ userLabel }: { userLabel: string }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground lg:flex print:hidden">
      <div className="px-1 py-2">
        <Logo href="/dashboard" className="text-sidebar-foreground" />
      </div>

      <CommandTrigger />

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="size-4 shrink-0" aria-hidden="true" />}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-sidebar-border pt-4">
        <p
          className="truncate px-3 text-xs text-sidebar-foreground/60"
          title={userLabel}
        >
          {userLabel}
        </p>
        <SignOutButton />
      </div>
    </aside>
  );
}
