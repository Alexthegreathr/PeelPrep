import {
  LayoutDashboard,
  Briefcase,
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
 * Primary app navigation. Product routes are added as they become real (no
 * dead links — AGENTS.md).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/history", label: "Interviews", icon: Briefcase },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];
