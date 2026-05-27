"use client";

import type { User } from "next-auth";
import { usePathname, useSearchParams } from "next/navigation";
import { OpenRequestsHub } from "@/components/request/open-requests-hub";
import { ServiceHub } from "@/components/services/service-hub";
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

  if (pathname === "/services" || pathname.startsWith("/services/")) {
    return <ServiceHub />;
  }

  if (pathname === "/open-requests") {
    return <OpenRequestsHub />;
  }

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    return null;
  }

  if (pathname.startsWith("/supplies/")) {
    return <SupplyShell />;
  }

  return <ChatShell />;
}
