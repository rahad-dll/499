"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* `compact` fields are shorter and show their error beside the label, so a
   form keeps the same height while it is being filled in. */
function FieldShell({
  label,
  htmlFor,
  labelEnd,
  error,
  compact = false,
  children,
}: {
  label: string;
  htmlFor?: string;
  labelEnd?: ReactNode;
  error?: string;
  compact?: boolean;
  children: ReactNode;
}) {
  const errorId = htmlFor && error ? `${htmlFor}-error` : undefined;
  return (
    <div className={compact ? "mt-2.5 short:mt-1.5 sm:mt-3" : "mt-3 sm:mt-5"}>
      <div className={cn("flex items-center justify-between gap-3", compact ? "mb-1" : "mb-1.5 sm:mb-2")}>
        <Label htmlFor={htmlFor}>{label}</Label>
        {compact && error ? (
          <span id={errorId} className="truncate text-[12.5px] font-medium text-destructive">
            {error}
          </span>
        ) : (
          labelEnd && <span className="text-sm">{labelEnd}</span>
        )}
      </div>
      <div className="relative flex items-center">{children}</div>
      {!compact && error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

type TextFieldProps = ComponentProps<typeof Input> & {
  label: string;
  icon: LucideIcon;
  labelEnd?: ReactNode;
  error?: string;
  compact?: boolean;
};

export function TextField({
  label,
  icon: Icon,
  labelEnd,
  error,
  compact = false,
  id,
  className,
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={inputId} labelEnd={labelEnd} error={error} compact={compact}>
      <Icon className="pointer-events-none absolute left-3.5 size-[18px] text-muted-foreground" />
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={compact && error && inputId ? `${inputId}-error` : undefined}
        className={cn(compact ? "h-11 pl-11 short:h-10" : "h-12 pl-11 sm:h-[50px]", className)}
        {...props}
      />
    </FieldShell>
  );
}

type PasswordFieldProps = TextFieldProps & { valid?: boolean };

export function PasswordField({
  label,
  icon: Icon,
  labelEnd,
  error,
  valid,
  compact = false,
  id,
  className,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;
  return (
    <FieldShell label={label} htmlFor={inputId} labelEnd={labelEnd} error={error} compact={compact}>
      <Icon className="pointer-events-none absolute left-3.5 size-[18px] text-muted-foreground" />
      <Input
        id={inputId}
        type={visible ? "text" : "password"}
        aria-invalid={error ? true : undefined}
        aria-describedby={compact && error && inputId ? `${inputId}-error` : undefined}
        className={cn(
          compact ? "h-11 pl-11 pr-11 short:h-10" : "h-12 pl-11 pr-11 sm:h-[50px]",
          valid && "border-emerald-500 pr-[74px] focus-visible:ring-emerald-500/25",
          className,
        )}
        {...props}
      />
      {valid && (
        <span className="pointer-events-none absolute right-11 text-emerald-500">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12 5 5L20 7" />
          </svg>
        </span>
      )}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2.5 flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </FieldShell>
  );
}
