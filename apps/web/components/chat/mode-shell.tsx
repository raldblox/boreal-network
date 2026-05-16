"use client";

import type { User } from "next-auth";
import { usePathname, useSearchParams } from "next/navigation";
import { SupplyHub } from "../supply/hub";
import { SupplyShell } from "../supply/shell";
import { HomePage } from "./homepage";
import { ChatShell } from "./shell";

export function ModeShell({ user: _user }: { user?: User | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  if (pathname === "/" && !mode) {
    return <HomePage />;
  }

  if (pathname === "/supplies") {
    return <SupplyHub />;
  }

  if (pathname.startsWith("/supplies/")) {
    return <SupplyShell />;
  }

  return <ChatShell />;
}
