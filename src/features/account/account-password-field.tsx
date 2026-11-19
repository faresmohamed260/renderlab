"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AccountPasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  description,
  labelAction,
  error,
  statusMessage,
  statusKind = "neutral",
  required = false,
  minLength,
  disabled = false,
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  description?: ReactNode;
  labelAction?: ReactNode;
  error?: ReactNode;
  statusMessage?: ReactNode;
  statusKind?: "neutral" | "success" | "error";
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function updateCapsLock(event: React.KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  }

  return (
    <Field>
      {labelAction ? (
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {labelAction}
        </div>
      ) : (
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
      )}
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={revealed ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={updateCapsLock}
          onKeyUp={updateCapsLock}
          onBlur={() => setCapsLock(false)}
          className="pr-14"
          required={required}
          minLength={minLength}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-md"
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          onClick={() => setRevealed((current) => !current)}
          disabled={disabled}
        >
          {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </Button>
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {capsLock ? (
        <p role="status" className="text-xs leading-5 text-text-muted">Caps Lock is on</p>
      ) : null}
      {statusMessage ? (
        <p
          role="status"
          className={cn(
            "text-xs leading-5",
            statusKind === "error" ? "text-danger" : statusKind === "success" ? "text-text" : "text-text-muted",
          )}
        >
          {statusMessage}
        </p>
      ) : null}
      <FieldError>{error}</FieldError>
    </Field>
  );
}
