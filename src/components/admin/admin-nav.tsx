"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminNavItem = { href: string; label: string; description: string };

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Yönetim menüsü" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs transition ${
              active ? "bg-charcoal text-ivory" : "text-ivory/70 hover:bg-white/10 hover:text-ivory"
            }`}
          >
            <span className="font-medium">{item.label}</span>
            <span className="mt-0.5 hidden text-[10px] text-ivory/40 lg:block">{item.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}
