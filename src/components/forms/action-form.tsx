"use client";
import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/actions/types";
import { initialState } from "@/lib/actions/types";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils/format";

export type FieldSpec =
  | { name: string; label: string; type: "text" | "email" | "password" | "date" | "number" | "tel"; required?: boolean; defaultValue?: string | number | null; hint?: string; placeholder?: string; min?: number; max?: number; span?: 2; autoComplete?: string }
  | { name: string; label: string; type: "textarea"; required?: boolean; defaultValue?: string | null; hint?: string; placeholder?: string; span?: 2; rows?: number }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean; defaultValue?: string | null; hint?: string; placeholder?: string; span?: 2 }
  | { name: string; label: string; type: "checkbox"; defaultChecked?: boolean; hint?: string; span?: 2 }
  | { name: string; label: string; type: "file"; required?: boolean; hint?: string; span?: 2; accept?: string };

export function ActionForm({
  action,
  fields,
  submitLabel = "Simpan",
  hidden,
  columns = 2,
  resetOnSuccess = false,
  className,
  submitVariant = "primary",
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  fields: FieldSpec[];
  submitLabel?: string;
  hidden?: Record<string, string>;
  columns?: 1 | 2;
  resetOnSuccess?: boolean;
  className?: string;
  submitVariant?: "primary" | "accent" | "danger" | "secondary";
}) {
  const [state, formAction] = useActionState(action, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={cn("space-y-4", className)} noValidate>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
        {fields.map((f) => {
          const id = `f-${f.name}`;
          const err = state.errors?.[f.name];
          const common = { id, name: f.name, "aria-invalid": err ? true : undefined, "aria-describedby": err ? `${id}-error` : undefined } as const;
          const span = f.span === 2 && columns === 2 ? "sm:col-span-2" : undefined;
          if (f.type === "checkbox") {
            return (
              <label key={f.name} htmlFor={id} className={cn("flex items-center gap-2.5 self-end pb-2 text-[13px]", span)}>
                <input {...common} type="checkbox" defaultChecked={f.defaultChecked} className="size-4 rounded border-line-strong accent-[var(--accent)]" />
                {f.label}
              </label>
            );
          }
          return (
            <Field key={f.name} label={f.label} htmlFor={id} error={err} hint={f.hint} required={"required" in f ? f.required : undefined} className={span}>
              {f.type === "textarea" ? (
                <Textarea {...common} required={f.required} defaultValue={f.defaultValue ?? ""} placeholder={f.placeholder} rows={f.rows ?? 4} />
              ) : f.type === "select" ? (
                <Select {...common} required={f.required} defaultValue={f.defaultValue ?? ""}>
                  <option value="">{f.placeholder ?? "— Pilih —"}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : f.type === "file" ? (
                <Input {...common} type="file" required={f.required} accept={f.accept ?? "application/pdf,image/jpeg,image/png,image/webp"} className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-[13px] file:font-medium" />
              ) : (
                <Input {...common} type={f.type} required={f.required} defaultValue={f.defaultValue ?? undefined} placeholder={f.placeholder} min={f.min} max={f.max} autoComplete={f.autoComplete} />
              )}
            </Field>
          );
        })}
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
