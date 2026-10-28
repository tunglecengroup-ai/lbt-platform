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
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/crm", label: "Khách hàng (CRM)", icon: Users, badge: "3" },
  { href: "/admin/students", label: "Học viên", icon: GraduationCap },
  { href: "/admin/courses", label: "Khóa học", icon: BookOpen },
  { href: "/admin/orders", label: "Đơn hàng", icon: Receipt },
  { href: "/admin/automation", label: "Automation", icon: Zap },
];
