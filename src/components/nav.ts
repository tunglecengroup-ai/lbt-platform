import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Receipt,
  Zap,
  Newspaper,
  MessageSquareQuote,
  KeyRound,
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
  { href: "/admin/codes", label: "Mã kích hoạt", icon: KeyRound },
  { href: "/admin/blog", label: "Blog & trang", icon: Newspaper },
  { href: "/admin/reviews", label: "Cảm nhận học viên", icon: MessageSquareQuote },
  { href: "/admin/automation", label: "Automation", icon: Zap },
];
