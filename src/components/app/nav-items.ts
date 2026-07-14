import {
  LayoutDashboard,
  UserRound,
  CreditCard,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Primary app navigation. Phase 2 ships the four shell destinations; the
 * interview, history, and other product routes are added in later phases as
 * they become real (no dead links — AGENTS.md).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];
