// LOCAL STAND-IN for @quikit/ui: delete at integration
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SliderPrimitive from "@radix-ui/react-slider";

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
    const base =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-[120ms] " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
      "disabled:opacity-40 disabled:pointer-events-none active:scale-[0.97]";

    const variants = {
      primary:
        "bg-accent-600 text-[rgb(14_13_11)] hover:bg-accent-500 focus-visible:ring-accent-500 shadow-token-sm",
      secondary:
        "bg-[rgb(var(--surface-raised))] text-[rgb(var(--text))] hover:bg-[rgb(var(--border))] focus-visible:ring-[rgb(var(--border-strong))]",
      outline:
        "border border-[rgb(var(--border-strong))] bg-transparent text-[rgb(var(--text-secondary))] " +
        "hover:bg-[rgb(var(--surface-raised))] hover:text-[rgb(var(--text))] focus-visible:ring-[rgb(var(--border-strong))]",
      destructive:
        "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500 shadow-token-sm",
      ghost:
        "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-raised))] hover:text-[rgb(var(--text))] focus-visible:ring-[rgb(var(--border-strong))]",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-11 px-6 text-base gap-2.5",
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
          "flex h-9 w-full rounded-lg border bg-[rgb(var(--surface))] px-3 py-2 text-sm " +
          "text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))] " +
          "border-[rgb(var(--border-strong))] " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent " +
          "disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[120ms]",
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
          "flex h-9 w-full rounded-lg border border-[rgb(var(--border-strong))] " +
          "bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--text))] " +
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-transparent " +
          "disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-[120ms]",
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
      {label && (
        <label className="text-xs font-semibold" style={{ color: "rgb(var(--text-secondary))" }}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>
      )}
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
        "rounded-xl p-5 shadow-token-sm",
        className
      )}
      style={{
        backgroundColor: "rgb(var(--surface))",
        border: "1px solid rgb(var(--border))",
        ...((props as React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }).style ?? {}),
      }}
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
    neutral:
      "bg-[rgb(var(--surface-raised))] text-[rgb(var(--text-secondary))] border border-[rgb(var(--border))]",
    green:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    amber:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    red:
      "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20",
    blue:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
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
            sideOffset={5}
            className="z-50 overflow-hidden rounded-lg px-3 py-1.5 text-xs shadow-token-md animate-in fade-in-0 zoom-in-95"
            style={{
              backgroundColor: "rgb(var(--text))",
              color: "rgb(var(--bg))",
              fontSize: "11px",
              fontWeight: 500,
            }}
          >
            {content}
            <TooltipPrimitive.Arrow style={{ fill: "rgb(var(--text))" }} />
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
      className={cn(
        "rounded-lg animate-pulse",
        className
      )}
      style={{ backgroundColor: "rgb(var(--surface-raised))" }}
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
      {icon && (
        <div className="mb-3" style={{ color: "rgb(var(--text-muted))" }}>
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold" style={{ color: "rgb(var(--text))" }}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs max-w-sm" style={{ color: "rgb(var(--text-muted))" }}>
          {description}
        </p>
      )}
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
    <div
      className={cn("inline-flex rounded-lg p-1 gap-0.5", className)}
      style={{ backgroundColor: "rgb(var(--surface-raised))" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            style={
              active
                ? {
                    backgroundColor: "rgb(var(--surface))",
                    color: "rgb(var(--text))",
                    boxShadow: "var(--shadow-sm)",
                  }
                : {
                    color: "rgb(var(--text-muted))",
                  }
            }
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl p-6 shadow-token-lg duration-200 animate-in fade-in-0 zoom-in-95"
          style={{
            backgroundColor: "rgb(var(--surface))",
            border: "1px solid rgb(var(--border))",
          }}
        >
          <div className="flex flex-col space-y-1.5 mb-4">
            <DialogPrimitive.Title
              className="text-base font-bold tracking-tight"
              style={{ color: "rgb(var(--text))" }}
            >
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description
                className="text-sm"
                style={{ color: "rgb(var(--text-muted))" }}
              >
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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          className="w-screen max-w-md p-6 shadow-token-lg flex flex-col justify-between"
          style={{
            backgroundColor: "rgb(var(--surface))",
            borderLeft: "1px solid rgb(var(--border))",
          }}
        >
          <div>
            <div
              className="flex items-center justify-between pb-4 mb-4"
              style={{ borderBottom: "1px solid rgb(var(--border))" }}
            >
              <h2
                className="text-base font-bold"
                style={{ color: "rgb(var(--text))" }}
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-sm px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                style={{ color: "rgb(var(--text-muted))" }}
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>
            <div>{children}</div>
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
    <div
      className="w-full overflow-x-auto rounded-lg"
      style={{ border: "1px solid rgb(var(--border))" }}
    >
      <table className="w-full text-left text-sm">
        <thead
          className="text-xs font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: "rgb(var(--surface-raised))",
            color: "rgb(var(--text-muted))",
          }}
        >
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={cn("px-4 py-3", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="divide-y"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              className="transition-colors duration-[80ms]"
              style={{ color: "rgb(var(--text-secondary))" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "rgb(var(--surface-raised))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              {columns.map((col, idx) => (
                <td key={idx} className={cn("px-4 py-3", col.className)}>
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
      <span className="text-xs" style={{ color: "rgb(var(--text-muted))" }}>
        Page {page} of {totalPages || 1}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
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

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false)
);

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
>(({ className, align = "center", sideOffset = 5, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      avoidCollisions={true}
      collisionPadding={8}
      className={cn(
        "z-50 w-80 rounded-xl p-4 shadow-token-lg outline-none " +
        "animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      style={{
        backgroundColor: "rgb(var(--surface))",
        border: "1px solid rgb(var(--border))",
        color: "rgb(var(--text))",
      }}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

// ── Slider ──
export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track
      className="relative h-1.5 w-full grow overflow-hidden rounded-full"
      style={{ backgroundColor: "rgb(var(--border))" }}
    >
      <SliderPrimitive.Range
        className="absolute h-full"
        style={{ backgroundColor: "rgb(var(--accent-500))" }}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-4 w-4 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      style={{
        backgroundColor: "rgb(var(--surface))",
        borderColor: "rgb(var(--accent-500))",
      }}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;
