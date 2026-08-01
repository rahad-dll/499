"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  ScanEye,
  Ticket,
  Users,
} from "lucide-react";
import { AuthorityShell } from "@/components/portal/AuthorityShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------------- mock data ---------------- */

type Violation =
  | "Illegal Parking"
  | "No-Parking Zone"
  | "Expired Meter"
  | "Blocked Driveway"
  | "Double Parking";

const VIOLATION_VARIANT: Record<Violation, "warning" | "destructive" | "info" | "purple"> = {
  "Illegal Parking": "warning",
  "No-Parking Zone": "destructive",
  "Expired Meter": "info",
  "Blocked Driveway": "destructive",
  "Double Parking": "purple",
};

interface Incident {
  id: string;
  time: string;
  violation: Violation;
  location: string;
  confidence: number;
  warden: string;
  resolved?: boolean;
}

const ACTIVE: Incident[] = [
  { id: "INC-2048", time: "Today · 14:22", violation: "Illegal Parking", location: "Road 11, Banani", confidence: 96, warden: "Warden Kabir" },
  { id: "INC-2047", time: "Today · 13:58", violation: "No-Parking Zone", location: "Gulshan Ave, Zone A", confidence: 99, warden: "Warden Nadia" },
  { id: "INC-2045", time: "Today · 13:10", violation: "Expired Meter", location: "Dhanmondi 27", confidence: 87, warden: "Warden Rafi" },
  { id: "INC-2044", time: "Today · 12:40", violation: "Blocked Driveway", location: "Uttara Sector 7", confidence: 94, warden: "Warden Sami" },
  { id: "INC-2041", time: "Today · 11:55", violation: "Illegal Parking", location: "Motijheel Plaza", confidence: 91, warden: "Warden Kabir" },
  { id: "INC-2039", time: "Today · 11:20", violation: "Double Parking", location: "Mirpur DOHS", confidence: 89, warden: "Warden Nadia" },
];

const RESOLVED: Incident[] = [
  { id: "INC-2036", time: "Today · 10:05", violation: "Illegal Parking", location: "Banani Block C", confidence: 95, warden: "Warden Rafi", resolved: true },
  { id: "INC-2031", time: "Today · 09:12", violation: "No-Parking Zone", location: "Gulshan 2 Circle", confidence: 98, warden: "Warden Sami", resolved: true },
  { id: "INC-2027", time: "Yesterday · 21:44", violation: "Expired Meter", location: "Dhanmondi 32", confidence: 84, warden: "Warden Kabir", resolved: true },
];

/* ---------------- incident card ---------------- */

function IncidentCard({ inc }: { inc: Incident }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-extrabold">{inc.id}</span>
        <Badge variant={VIOLATION_VARIANT[inc.violation]}>
          <span className="size-1.5 rounded-full bg-current" />
          {inc.violation}
        </Badge>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {inc.time}
      </div>

      <div className="mt-3.5 border-t border-border pt-3.5">
        <div className="flex items-center gap-1.5 text-[13.5px] font-semibold">
          <MapPin className="size-4 text-muted-foreground" />
          {inc.location}
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ScanEye className="size-4" />
            AI Confidence
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${inc.confidence}%` }} />
          </div>
          <span className="font-extrabold text-foreground">{inc.confidence}%</span>
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="size-8 shrink-0 rounded-full bg-gradient-to-br from-[#4d7cf5] to-[#8b6cff]" />
          <span>
            <div className="text-[13.5px] font-bold">{inc.warden}</div>
            <div className="text-xs text-muted-foreground">
              {inc.resolved ? "Resolved by" : "Assigned Warden"}
            </div>
          </span>
        </div>
      </div>

      <Button variant="brand" className="mt-4 w-full">
        <Eye className="size-4" />
        View Evidence
      </Button>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function EnforcementLogsPage() {
  const [tab, setTab] = useState<"active" | "resolved">("active");
  const list = tab === "active" ? ACTIVE : RESOLVED;

  return (
    <AuthorityShell active="enforcement">
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          Enforcement Logs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review AI-detected violations and warden dispatch history.
        </p>

        {/* stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Ticket className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">142</div>
              <div className="text-[13px] text-muted-foreground">Tickets Issued (Today)</div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <Users className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">28</div>
              <div className="text-[13px] text-muted-foreground">Wardens Dispatched</div>
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-card p-5 sm:col-span-1">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-[22px]" />
            </span>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">96</div>
              <div className="text-[13px] text-muted-foreground">Resolved Incidents</div>
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="mt-6 inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === "active" ? "bg-brand/10 text-teal-600 dark:text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Active Incidents
            <Badge variant={tab === "active" ? "info" : "secondary"} className="px-2">12</Badge>
          </button>
          <button
            type="button"
            onClick={() => setTab("resolved")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              tab === "resolved" ? "bg-brand/10 text-teal-600 dark:text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Resolved History
            <Badge variant="secondary" className="px-2">96</Badge>
          </button>
        </div>

        {/* incident grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((inc) => (
            <IncidentCard key={inc.id} inc={inc} />
          ))}
        </div>
      </main>
    </AuthorityShell>
  );
}
