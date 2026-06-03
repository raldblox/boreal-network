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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Form action={action} className="flex flex-col gap-4">
      {mode === "register" ? (
        <>
          <div className="flex flex-col gap-2">
            <Label
              className="text-sm font-medium text-foreground"
              htmlFor="username"
            >
              Username
            </Label>
            <Input
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect="off"
              className="h-11 rounded-lg border-border/70 bg-background text-sm shadow-none"
              defaultValue={defaultUsername}
              id="username"
              maxLength={24}
              minLength={3}
              name="username"
              placeholder="your-name"
              required
              type="text"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              className="text-sm font-medium text-foreground"
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
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Label
            className="text-sm font-medium text-foreground"
            htmlFor="identifier"
          >
            Username or email
          </Label>
          <Input
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect="off"
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

      <div className="flex flex-col gap-2">
        <Label
          className="text-sm font-medium text-foreground"
          htmlFor={passwordId}
        >
          Password
        </Label>
        <div className="relative">
          <Input
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            className="h-11 rounded-lg border-border/70 bg-background pr-12 text-sm shadow-none"
            id={passwordId}
            minLength={6}
            name="password"
            placeholder={mode === "register" ? "6+ characters" : "Password"}
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
      </div>

      <div className="pt-1">{children}</div>
    </Form>
  );
}
