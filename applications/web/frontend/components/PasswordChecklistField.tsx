"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Check, Eye, EyeOff, Lock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* ---------- validation rules ---------- */
export interface PasswordRule {
  id: string;
  label: string;
  /** chip text for the compact checklist */
  short: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "8+ characters", short: "8+ chars", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase (A-Z)", short: "A–Z", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase (a-z)", short: "a–z", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number (0-9)", short: "0–9", test: (v) => /[0-9]/.test(v) },
  {
    id: "symbol",
    label: "One symbol (!@#$%)",
    short: "Symbol",
    test: (v) => /[!@#$%^&*(),.?":{}|<>_\-+=/[\]\\';`~]/.test(v),
  },
];

export function passwordScore(value: string): number {
  return PASSWORD_RULES.reduce((n, r) => n + (r.test(value) ? 1 : 0), 0);
}

export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}

function tier(score: number): "weak" | "fair" | "strong" {
  if (score <= 2) return "weak";
  if (score <= 4) return "fair";
  return "strong";
}

const SEG_COLOR: Record<string, string> = {
  weak: "bg-destructive",
  fair: "bg-[#eab308]",
  strong: "bg-[#22c55e]",
};

type Props = Omit<ComponentProps<typeof Input>, "type"> & {
  label: string;
  value: string;
  labelEnd?: ReactNode;
  showChecklistWhenEmpty?: boolean;
  /** Shorter input and an always-visible one-row checklist, so the form
   *  never grows while the password is typed. */
  compact?: boolean;
};

export function PasswordChecklistField({
  label,
  value,
  labelEnd,
  showChecklistWhenEmpty = false,
  compact = false,
  id,
  className,
  ...props
}: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;
  const score = passwordScore(value);
  const level = tier(score);
  const showMeta = showChecklistWhenEmpty || value.length > 0;

  return (
    <div className={compact ? "mt-2.5 short:mt-1.5 sm:mt-3" : "mt-3 sm:mt-5"}>
      <div className={cn("flex items-center justify-between", compact ? "mb-1" : "mb-1.5 sm:mb-2")}>
        <Label htmlFor={inputId}>{label}</Label>
        {labelEnd && <span className="text-sm">{labelEnd}</span>}
      </div>

      <div className="relative flex items-center">
        <Lock className="pointer-events-none absolute left-3.5 size-[18px] text-muted-foreground" />
        <Input
          id={inputId}
          type={visible ? "text" : "password"}
          value={value}
          aria-describedby={compact ? `${inputId}-rules` : undefined}
          className={cn(compact ? "h-11 pl-11 pr-11 short:h-10" : "h-12 pl-11 pr-11 sm:h-[50px]", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2.5 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>

      {compact ? (
        <div id={`${inputId}-rules`}>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {PASSWORD_RULES.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-colors duration-300",
                  i < score ? SEG_COLOR[level] : "bg-muted",
                )}
              />
            ))}
          </div>
          <ul aria-label="Password requirements" className="mt-1.5 flex flex-wrap gap-1">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(value);
              return (
                <li
                  key={rule.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold transition-colors duration-300",
                    met ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground",
                  )}
                >
                  {met ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                  {rule.short}
                  <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : showMeta && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {PASSWORD_RULES.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-[5px] rounded-full transition-colors duration-300",
                  i < score ? SEG_COLOR[level] : "bg-muted",
                )}
              />
            ))}
          </div>

          <ul className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(value);
              return (
                <li
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-2 text-[13px] font-medium transition-colors duration-300",
                    met ? "text-emerald-500" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[18px] items-center justify-center rounded-full transition-colors duration-300",
                      met
                        ? "bg-emerald-500/20 text-emerald-500"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={met ? "check" : "cross"}
                        initial={{ scale: 0, rotate: -90, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="inline-flex"
                      >
                        {met ? (
                          <Check className="size-3" strokeWidth={3} />
                        ) : (
                          <X className="size-3" strokeWidth={3} />
                        )}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </div>
  );
}
