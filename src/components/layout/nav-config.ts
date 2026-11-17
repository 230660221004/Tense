import type { LucideIcon } from "lucide-react";
import {
  Archive, BadgeCheck, Bell, BookOpen, CalendarRange, ClipboardList, FileText, FolderLock, Gauge,
  GraduationCap, HeartHandshake, History, Layers, Mail, Scale, Settings, Users, UserRound,
} from "lucide-react";
import type { UserRole } from "@/lib/domain/types";
import { ROUTE_ROLES, type RouteKey } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  route: RouteKey;
  badgeKey?: "persetujuan" | "notifikasi";
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Utama",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge, route: "dashboard" },
      { href: "/arsip", label: "Arsip Pelanggaran", icon: Archive, route: "arsip" },
      { href: "/persetujuan", label: "Persetujuan", icon: BadgeCheck, route: "persetujuan", badgeKey: "persetujuan" },
      { href: "/siswa", label: "Siswa", icon: GraduationCap, route: "siswa" },
    ],
  },
  {
    label: "Pembinaan",
    items: [
      { href: "/tindak-lanjut", label: "Tindak Lanjut", icon: ClipboardList, route: "tindakLanjut" },
      { href: "/remisi", label: "Remisi", icon: HeartHandshake, route: "remisi" },
      { href: "/surat", label: "Surat", icon: Mail, route: "surat" },
      { href: "/dokumen", label: "Dokumen", icon: FolderLock, route: "dokumen" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { href: "/notifikasi", label: "Notifikasi", icon: Bell, route: "notifikasi", badgeKey: "notifikasi" },
      { href: "/audit", label: "Audit Trail", icon: History, route: "audit" },
      { href: "/master/tahun-ajaran", label: "Tahun Ajaran", icon: CalendarRange, route: "master" },
      { href: "/master/kelas", label: "Kelas", icon: Layers, route: "master" },
      { href: "/master/siswa", label: "Data Siswa", icon: Users, route: "master" },
      { href: "/master/jenis-pelanggaran", label: "Jenis Pelanggaran", icon: BookOpen, route: "master" },
      { href: "/master/tingkat-sanksi", label: "Tingkat Sanksi", icon: Scale, route: "master" },
      { href: "/master/template-surat", label: "Template Surat", icon: FileText, route: "master" },
      { href: "/master/pengguna", label: "Pengguna", icon: UserRound, route: "master" },
      { href: "/pengaturan", label: "Pengaturan", icon: Settings, route: "pengaturan" },
    ],
  },
];

export function navForRole(role: UserRole): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => (ROUTE_ROLES[i.route] as readonly UserRole[]).includes(role)) })).filter((g) => g.items.length > 0);
}
