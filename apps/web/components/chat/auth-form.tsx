"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import Form from "next/form";
import { useId, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function AuthForm({
  action,
  children,
  defaultIdentifier = "",
  defaultEmail = "",
  defaultUsername = "",
  mode = "login",
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultIdentifier?: string;
  defaultEmail?: string;
  defaultUsername?: string;
  mode?: "login" | "register";
}) {
  const passwordId = useId();
  const passwordHelpId = useId();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form action={action} className="flex flex-col gap-5">
      {mode === "register" ? (
        <>
          <div className="flex flex-col gap-2.5">
            <Label
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72"
              htmlFor="username"
            >
              Username
            </Label>
            <Input
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              autoFocus
              className="h-11 rounded-lg border-border/70 bg-background text-sm shadow-none"
              defaultValue={defaultUsername}
              id="username"
              name="username"
              placeholder="your-name"
              required
              type="text"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <Label
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72"
              htmlFor="email"
            >
              Email
            </Label>
            <Input
              autoComplete="email"
              className="h-11 rounded-lg border-border/70 bg-background text-sm shadow-none"
              defaultValue={defaultEmail}
              id="email"
              name="email"
              placeholder="you@team.com"
              required
              type="email"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Email is still required for account recovery until recovery codes
              are added.
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Label
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72"
            htmlFor="identifier"
          >
            Username or email
          </Label>
          <Input
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect="off"
            autoFocus
            className="h-11 rounded-lg border-border/70 bg-background text-sm shadow-none"
            defaultValue={defaultIdentifier}
            id="identifier"
            name="identifier"
            placeholder="your-name or you@team.com"
            required
            type="text"
          />
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <Label
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72"
          htmlFor={passwordId}
        >
          Password
        </Label>
        <div className="relative">
          <Input
            aria-describedby={passwordHelpId}
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            className="h-11 rounded-lg border-border/70 bg-background pr-12 text-sm shadow-none"
            id={passwordId}
            name="password"
            placeholder="Enter password"
            required
            type={showPassword ? "text" : "password"}
          />
          <Button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1 top-1 size-9 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((value) => !value)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {showPassword ? (
              <EyeOffIcon aria-hidden="true" className="size-4" />
            ) : (
              <EyeIcon aria-hidden="true" className="size-4" />
            )}
          </Button>
        </div>
        <p
          className="text-xs leading-5 text-muted-foreground"
          id={passwordHelpId}
        >
          {mode === "register"
            ? "Use at least 6 characters. Add a passkey after account creation for faster sign-in."
            : "Use password fallback only when passkey sign-in is not available."}
        </p>
      </div>

      <div className="pt-1">{children}</div>
    </Form>
  );
}
