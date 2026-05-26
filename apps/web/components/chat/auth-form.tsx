import Form from "next/form";

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
              className="h-12 rounded-2xl border-border/60 bg-muted/[0.36] text-sm shadow-none transition-colors focus:border-foreground/20 focus:bg-background"
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
              className="h-12 rounded-2xl border-border/60 bg-muted/[0.36] text-sm shadow-none transition-colors focus:border-foreground/20 focus:bg-background"
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
            className="h-12 rounded-2xl border-border/60 bg-muted/[0.36] text-sm shadow-none transition-colors focus:border-foreground/20 focus:bg-background"
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
          htmlFor="password"
        >
          Password
        </Label>
        <Input
          className="h-12 rounded-2xl border-border/60 bg-muted/[0.36] text-sm shadow-none transition-colors focus:border-foreground/20 focus:bg-background"
          id="password"
          name="password"
          placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
          required
          type="password"
        />
      </div>

      <div className="pt-1">{children}</div>
    </Form>
  );
}
