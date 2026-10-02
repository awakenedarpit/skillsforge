// LOCAL STAND-IN for @quikit/ui: delete at integration
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";

// ── cn Utility ──
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date Formatting Utilities ──
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return d.toISOString().split("T")[0];
}

export function formatRelativeDate(targetDate: string | Date | null | undefined, asOf: string | Date = new Date()): string {
  if (!targetDate) return "-";
  const target = new Date(targetDate);
  const base = new Date(asOf);
  if (isNaN(target.getTime()) || isNaN(base.getTime())) return "-";
  
  const diffTime = target.getTime() - base.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "today";
  if (diffDays > 0) return `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
}

// ── Button ──
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 focus:ring-slate-400",
      outline: "border border-slate-300 bg-transparent hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 focus:ring-slate-400",
      destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-slate-400",
    };
    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-12 px-6 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// ── Input ──
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ── DateInput ──
export const DateInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return <Input type="date" ref={ref} className={cn("appearance-none", className)} {...props} />;
  }
);
DateInput.displayName = "DateInput";

// ── Select ──
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

// ── Field & FormRow ──
export function Field({
  label,
  error,
  children,
  className,
}: {
  label?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</label>}
      {children}
      {error && <span className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</span>}
    </div>
  );
}

export function FormRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>{children}</div>;
}

// ── Card ──
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Badge ──
export function Badge({
  variant = "neutral",
  className,
  children,
}: {
  variant?: "neutral" | "green" | "amber" | "red" | "blue";
  className?: string;
  children: ReactNode;
}) {
  const variants = {
    neutral: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
    red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// ── Tooltip ──
export function Tooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={4}
            className="z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 dark:bg-slate-100 dark:text-slate-900"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-slate-900 dark:fill-slate-100" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// ── Skeleton ──
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)}
      {...props}
    />
  );
}

// ── EmptyState ──
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      {icon && <div className="mb-3 text-slate-400 dark:text-slate-600">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Segmented Control ──
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: { label: ReactNode; value: T }[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Modal / Dialog ──
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-200 bg-white p-6 shadow-lg duration-200 rounded-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col space-y-1.5 text-left">
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="text-sm text-slate-500 dark:text-slate-400">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── SlidePanel (Drawer from Right) ──
export function SlidePanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DataTable ──
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyText = "No records found",
}: {
  columns: { header: string; cell: (item: T) => ReactNode; className?: string }[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyText?: string;
}) {
  if (data.length === 0) {
    return <EmptyState title={emptyText} />;
  }
  return (
    <div className="w-full overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={cn("px-4 py-3", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
              {columns.map((col, idx) => (
                <td key={idx} className={cn("px-4 py-3 text-slate-700 dark:text-slate-300", col.className)}>
                  {col.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ──
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-xs text-slate-500">
        Page {page} of {totalPages || 1}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

// ── ConfirmProvider & useConfirm ──
interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(() => Promise.resolve(false));

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    opts: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const confirm = (opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({ opts, resolve });
    });
  };

  const handleClose = (result: boolean) => {
    if (dialogState) {
      dialogState.resolve(result);
      setDialogState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialogState && (
        <Modal
          open={true}
          onOpenChange={() => handleClose(false)}
          title={dialogState.opts.title}
          description={dialogState.opts.message}
        >
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              {dialogState.opts.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={dialogState.opts.destructive ? "destructive" : "primary"}
              size="sm"
              onClick={() => handleClose(true)}
            >
              {dialogState.opts.confirmLabel ?? "Confirm"}
            </Button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

// ── ThemeApplier ──
export function ThemeApplier() {
  return null;
}

// ── Popover ──
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl outline-none animate-in fade-in-0 zoom-in-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

