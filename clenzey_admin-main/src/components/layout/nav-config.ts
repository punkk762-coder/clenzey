import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCircle2,
  Sparkles,
  Map,
  Ticket,
  Briefcase,
  CalendarClock,
  Settings,
  AlertTriangle,
  Star,
  CreditCard,
  Radio,
  Wallet,
  Percent,
  Radar,
} from "lucide-react";

export type NavGroup = "Operations" | "Catalogue" | "Network" | "System";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, group: "Operations" },
  { href: "/bookings", label: "Bookings", icon: ClipboardList, group: "Operations" },
  { href: "/dispatch", label: "Dispatch", icon: Radio, group: "Operations" },
  { href: "/quotations", label: "Corporate", icon: Briefcase, group: "Operations" },
  { href: "/slots", label: "Time Slots", icon: CalendarClock, group: "Operations" },
  { href: "/disputes", label: "Disputes", icon: AlertTriangle, group: "Operations" },
  { href: "/payments", label: "Payments", icon: CreditCard, group: "Operations" },
  { href: "/payroll", label: "Payroll", icon: Wallet, group: "Operations" },
  { href: "/pricing-settings", label: "Platform Pricing", icon: Percent, group: "Operations" },

  { href: "/services", label: "Services", icon: Sparkles, group: "Catalogue" },
  { href: "/coupons", label: "Coupons", icon: Ticket, group: "Catalogue" },
  { href: "/zones", label: "Geofences", icon: Map, group: "Catalogue" },

  { href: "/partners", label: "Partners", icon: Users, group: "Network" },
  { href: "/partners/live", label: "Live Partners", icon: Radar, group: "Network" },
  { href: "/customers", label: "Customers", icon: UserCircle2, group: "Network" },
  { href: "/reviews", label: "Reviews", icon: Star, group: "Network" },

  { href: "/settings", label: "Settings", icon: Settings, group: "System" },
];

export const NAV_GROUPS: NavGroup[] = [
  "Operations",
  "Catalogue",
  "Network",
  "System",
];

export function getActiveNavItem(pathname: string): NavItem | undefined {
  const matches = NAV_ITEMS.filter(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0];
}
