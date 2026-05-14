import Form from "next/form";

import { Input } from "../ui/input";
import { Label } from "../ui/label";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  return (
    <Form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2.5">
        <Label
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72"
          htmlFor="email"
        >
          Email
        </Label>
        <Input
          autoComplete="email"
          autoFocus
          className="h-12 rounded-2xl border-border/60 bg-muted/[0.36] text-sm shadow-none transition-colors focus:border-foreground/20 focus:bg-background"
          defaultValue={defaultEmail}
          id="email"
          name="email"
          placeholder="you@team.com"
          required
          type="email"
        />
      </div>

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
