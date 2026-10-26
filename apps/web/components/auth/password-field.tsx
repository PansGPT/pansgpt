"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@pansgpt/ui/auth";

export function PasswordField(
  props: Omit<InputProps, "type" | "trailingAction">
): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const name = typeof props.label === "string" ? props.label.toLowerCase() : "password";
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailingAction={
        <button
          className="auth-password-toggle"
          type="button"
          aria-label={`${visible ? "Hide" : "Show"} ${name}`}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      }
    />
  );
}
