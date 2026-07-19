import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Receipt,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/crm", label: "Khách hàng (CRM)", icon: Users, badge: "3" },
  { href: "/students", label: "Học viên", icon: GraduationCap },
  { href: "/courses", label: "Khóa học", icon: BookOpen },
  { href: "/orders", label: "Đơn hàng", icon: Receipt, badge: "1" },
  { href: "/automation", label: "Automation", icon: Zap },
];
