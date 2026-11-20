import { passwordPolicy } from "@/config/account";

export type AuthMode = "login" | "signup" | "forgot" | "reset" | "verify";
export type AuthField =
  | "fullName"
  | "email"
  | "password"
  | "confirmPassword"
  | "terms";
export type FieldErrors = Partial<Record<AuthField, string>>;
export const fieldsByMode: Record<AuthMode, readonly AuthField[]> = {
  login: ["email", "password"],
  signup: ["fullName", "email", "password", "terms"],
  forgot: ["email"],
  reset: ["password", "confirmPassword"],
  verify: ["email"],
};
export const validEmail = (value: string) =>
  value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const validNewPassword = (value: string) =>
  value.length >= passwordPolicy.min && value.length <= passwordPolicy.max;
export const readField = (data: FormData, field: AuthField) =>
  String(data.get(field) ?? "");

export function validateAuth(mode: AuthMode, data: FormData): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fieldsByMode[mode]) {
    const value = readField(data, field);
    switch (field) {
      case "fullName":
        if (!value.trim() || value.trim().length > 100)
          errors[field] = "Enter your full name (up to 100 characters).";
        break;
      case "email":
        if (!validEmail(value)) errors[field] = "Enter a valid email address.";
        break;
      case "password":
        if (!value) errors[field] = "Enter your password.";
        else if (mode !== "login" && !validNewPassword(value))
          errors[field] =
            `Use ${passwordPolicy.min}–${passwordPolicy.max} characters.`;
        else if (mode === "login" && value.length > 1024)
          errors[field] = "This password is too long.";
        break;
      case "confirmPassword":
        if (!value) errors[field] = "Enter your new password again.";
        else if (value !== readField(data, "password"))
          errors[field] = "Your passwords don’t match.";
        break;
      case "terms":
        if (!data.has(field))
          errors[field] = "Acknowledge the terms to continue.";
        break;
    }
  }
  return errors;
}
