"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { NavLink } from "@/components/app/nav-link";
import { SignOutButton } from "@/components/app/sign-out-button";
import { NAV_ITEMS } from "@/components/app/nav-items";

export function MobileNav({ userLabel }: { userLabel: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation menu"
        className="inline-flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="left">
        <SheetTitle asChild>
          <div className="px-1">
            <Logo href="/dashboard" className="text-sidebar-foreground" />
          </div>
        </SheetTitle>

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              onNavigate={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
