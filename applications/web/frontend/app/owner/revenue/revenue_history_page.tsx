"use client";

import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Download,
  MoreVertical,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------- mock data ---------------- */

const SUMMARY: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
  delta: string;
  deltaClass: string;
}[] = [
  { icon: Receipt, iconClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400", label: "Total Transactions", value: "1,284", delta: "+8.4% vs last month", deltaClass: "text-emerald-600 dark:text-emerald-400" },
  { icon: CircleDollarSign, iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", label: "Total Revenue", value: "৳4,82,600", delta: "+12.1% vs last month", deltaClass: "text-emerald-600 dark:text-emerald-400" },
  { icon: Clock, iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400", label: "Avg Parking Duration", value: "2h 48m", delta: "-4m vs last month", deltaClass: "text-violet-600 dark:text-violet-400" },
];

type TxStatus = "Paid" | "Pending" | "Refunded";

const STATUS_VARIANT: Record<TxStatus, "success" | "warning" | "secondary"> = {
  Paid: "success",
  Pending: "warning",
  Refunded: "secondary",
};

const TRANSACTIONS: {
  when: string;
  driver: string;
  slot: string;
  duration: string;
  amount: string;
  status: TxStatus;
}[] = [
  { when: "Jan 15, 2026 · 14:32", driver: "DRV-2847", slot: "Gulshan 2 — A12", duration: "3h 20m", amount: "৳420.00", status: "Paid" },
  { when: "Jan 15, 2026 · 12:05", driver: "DRV-1120", slot: "Banani Blk C — B04", duration: "1h 10m", amount: "৳140.00", status: "Paid" },
  { when: "Jan 14, 2026 · 19:48", driver: "DRV-3391", slot: "Dhanmondi — C22", duration: "5h 05m", amount: "৳620.00", status: "Pending" },
  { when: "Jan 14, 2026 · 09:14", driver: "DRV-0876", slot: "Gulshan 1 — A03", duration: "2h 40m", amount: "৳330.00", status: "Paid" },
  { when: "Jan 13, 2026 · 21:30", driver: "DRV-4502", slot: "Uttara — D17", duration: "0h 45m", amount: "৳90.00", status: "Refunded" },
  { when: "Jan 13, 2026 · 16:52", driver: "DRV-2210", slot: "Banani Blk E — B19", duration: "4h 15m", amount: "৳510.00", status: "Paid" },
  { when: "Jan 12, 2026 · 11:03", driver: "DRV-1783", slot: "Gulshan 2 — A08", duration: "1h 55m", amount: "৳240.00", status: "Pending" },
];

const COLUMNS = ["Date / Time", "Driver ID", "Parking Slot", "Duration", "Amount", "Status", "Actions"];

/* ---------------- page ---------------- */

export default function RevenueHistoryPage() {
  return (
    <OwnerShell active="revenue" breadcrumb="Revenue">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            Revenue History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Transactions and payouts for the selected period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="h-11 rounded-xl">
            <Calendar className="size-4 text-teal-600 dark:text-brand" />
            Jan 1 – Jan 31, 2026
            <ChevronRight className="size-4 text-muted-foreground" />
          </Button>
          <Button variant="brand" className="h-11 rounded-xl">
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SUMMARY.map((s) => (
          <div key={s.label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", s.iconClass)}>
              <s.icon className="size-[22px]" />
            </span>
            <div>
              <div className="text-[13px] text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-extrabold tracking-tight">{s.value}</div>
              <div className={cn("text-xs font-semibold", s.deltaClass)}>{s.delta}</div>
            </div>
          </div>
        ))}
      </div>

      {/* transactions — table on ≥md, cards on mobile */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="hidden md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {COLUMNS.map((c) => (
                  <th key={c} className={cn("px-5 py-3.5 font-bold", c === "Actions" && "text-right")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((tx) => (
                <tr key={`${tx.driver}-${tx.when}`} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-4 text-muted-foreground">{tx.when}</td>
                  <td className="px-5 py-4 font-bold text-teal-600 dark:text-brand">{tx.driver}</td>
                  <td className="px-5 py-4">{tx.slot}</td>
                  <td className="px-5 py-4 text-muted-foreground">{tx.duration}</td>
                  <td className="px-5 py-4 font-extrabold">{tx.amount}</td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_VARIANT[tx.status]}>
                      <span className="size-1.5 rounded-full bg-current" />
                      {tx.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button type="button" aria-label="Row actions" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                      <MoreVertical className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="flex flex-col divide-y divide-border md:hidden">
          {TRANSACTIONS.map((tx) => (
            <div key={`${tx.driver}-${tx.when}`} className="flex flex-col gap-2 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-teal-600 dark:text-brand">{tx.driver}</span>
                <Badge variant={STATUS_VARIANT[tx.status]}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {tx.status}
                </Badge>
              </div>
              <div className="text-sm font-semibold">{tx.slot}</div>
              <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                <span>{tx.when}</span>
                <span>{tx.duration}</span>
                <span className="font-extrabold text-foreground">{tx.amount}</span>
              </div>
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          <span className="text-[13px] text-muted-foreground">
            Showing 1–7 of 1,284 transactions
          </span>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Previous page" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
              <ChevronLeft className="size-4" />
            </button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border text-sm font-semibold",
                  n === 1
                    ? "border-brand/50 bg-brand/10 text-teal-600 dark:text-brand"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
            <button type="button" aria-label="Next page" className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </OwnerShell>
  );
}
