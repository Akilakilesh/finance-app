"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint ? (
        <span className="ml-2 text-xs text-muted-foreground">{hint}</span>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const controlClass =
  "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors duration-150 placeholder:text-muted-foreground/70 hover:border-foreground/25 focus:border-foreground focus:ring-2 focus:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50";

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`${controlClass} ${className}`} />;
}

export function TextArea({
  className = "",
  ...props
}: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${controlClass} ${className}`} />;
}

/**
 * A drop-in replacement for a native `<select>` built on Radix UI. It still
 * accepts `<option>` children plus `value`/`onChange`, so every existing form
 * keeps working while getting a themed, animated, keyboard-friendly dropdown.
 */
interface SelectProps {
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
  "aria-label"?: string;
}

interface OptionData {
  value: string;
  label: ReactNode;
}

function readOptions(children: ReactNode): OptionData[] {
  const options: OptionData[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string | number; children?: ReactNode };
    if (props.value === undefined) return;
    options.push({ value: String(props.value), label: props.children });
  });
  return options;
}

export function Select({
  value,
  onChange,
  className = "",
  disabled,
  children,
  "aria-label": ariaLabel,
}: SelectProps) {
  const options = readOptions(children);
  const selected = options.find((option) => option.value === value);

  return (
    <SelectPrimitive.Root
      value={value || undefined}
      onValueChange={(next) => onChange?.({ target: { value: next } })}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={`group flex w-full items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 py-2 text-left text-sm text-foreground shadow-sm outline-none transition-all duration-150 select-none hover:border-foreground/25 focus:border-foreground focus:ring-2 focus:ring-ring/15 active:scale-[0.99] data-[state=open]:border-foreground data-[state=open]:ring-2 data-[state=open]:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <SelectPrimitive.Value>
          {selected ? selected.label : null}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="select-content z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-foreground outline-none transition-colors select-none data-[highlighted]:bg-accent data-[state=checked]:font-medium"
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="size-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
