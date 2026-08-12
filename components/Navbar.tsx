"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/utils";
import type { UserDoc } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", roles: ["member", "supervisor", "admin"] },
  { href: "/shifts", label: "الشفتات", roles: ["member", "supervisor", "admin"] },
  { href: "/tasks", label: "التاسكات", roles: ["member", "supervisor", "admin"] },
  { href: "/requests", label: "طلبات تغيير الشفت", roles: ["member", "supervisor", "admin"] },
  { href: "/swaps", label: "التبديلات", roles: ["supervisor", "admin"] },
  { href: "/salary", label: "المرتبات", roles: ["member", "supervisor", "admin"] },
  { href: "/members", label: "الأعضاء", roles: ["supervisor", "admin"] },
  { href: "/departments", label: "الأقسام", roles: ["admin"] },
  { href: "/performance", label: "الأداء", roles: ["member", "supervisor", "admin"] },
];

const ROLE_BADGE: Record<string, string> = {
  member: "bg-sky-100 text-sky-700",
  supervisor: "bg-emerald-100 text-emerald-700",
  admin: "bg-purple-100 text-purple-700",
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserDoc | null>(null);

  useEffect(() => {
    api<{ user: UserDoc | null }>("/api/me")
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  if (!user) return null;

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role));

  async function handleLogout() {
    await api("/api/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            ش
          </span>
          <span className="hidden text-lg font-bold text-slate-800 sm:block">نظام إدارة الشركة</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-left md:block">
            <div className="text-sm font-semibold text-slate-800">{user.name}</div>
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}>
              {user.role === "admin" ? "سوبر أدمن" : user.role === "supervisor" ? "مشرف" : "عضو"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}
