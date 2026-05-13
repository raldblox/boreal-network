"use client";

import { usePathname } from "next/navigation";
import { ChatShell } from "./shell";
import { SupplyShell } from "../supply/shell";

export function ModeShell() {
  const pathname = usePathname();

  if (pathname.startsWith("/supplies/")) {
    return <SupplyShell />;
  }

  return <ChatShell />;
}
