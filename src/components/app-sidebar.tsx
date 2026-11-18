"use client";

import {
  Bot, CalendarDays, ChartColumn, ChartLine, CreditCard, HandCoins, LayoutDashboard, Menu,
  PiggyBank, Radar, Receipt, Settings, TrendingUp, Wallet, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS, type NavIcon } from "@/lib/navigation";
import { Logo } from "./brand";
import { cn } from "./ui";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard, wallet: Wallet, income: TrendingUp, expenses: Receipt, debts: CreditCard,
  payday: HandCoins, buckets: PiggyBank, investments: ChartLine, radar: Radar, cfo: Bot,
  calendar: CalendarDays, reports: ChartColumn, settings: Settings,
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menú principal" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item, i) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.slug}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-brand/12 font-medium text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <span className="w-4 text-right text-[11px] text-muted/60 num">{i + 1}</span>
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand" : "")} aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
      <div className="mb-6 px-3">
        <Logo href="/dashboard" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavList />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface px-3 py-5">
            <div className="mb-6 flex items-center justify-between px-3">
              <Logo href="/dashboard" />
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Cerrar menú">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
