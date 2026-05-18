"use client";

/**
 * Minimal native-select primitive shaped like shadcn's Select API surface,
 * but using a real <select> under the hood for v1 simplicity.
 *
 * Use as:
 *   <NativeSelect value={x} onValueChange={setX}>
 *     <option value="LEAVE">Leave</option>
 *     ...
 *   </NativeSelect>
 *
 * Designed to work cleanly with react-hook-form's `register` (it spreads
 * standard <select> props).
 */

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NativeSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  onValueChange?: (value: string) => void;
  onChange?: SelectHTMLAttributes<HTMLSelectElement>["onChange"];
}

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  function NativeSelect({ className, onValueChange, onChange, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          onChange={(e) => {
            onChange?.(e);
            onValueChange?.(e.target.value);
          }}
          className={cn(
            "flex h-10 w-full appearance-none items-center rounded-md border border-zinc-200 bg-white pl-3 pr-9 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:focus-visible:ring-zinc-300",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
        />
      </div>
    );
  },
);
