"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarSurfaceTopNav } from "../chat/surface-top-nav";
import {
  surfaceBodyClassName,
  surfaceColumnClassName,
  surfaceEyebrowClassName,
  surfaceHeroTitleClassName,
  surfacePageClassName,
  surfaceScrollClassName,
  surfaceShellClassName,
  surfaceViewportClassName,
} from "../chat/surface-layout";
import { RequestBoard } from "./request-board";

export function OpenRequestsHub() {
  return (
    <div className={surfacePageClassName}>
      <div className={surfaceColumnClassName}>
        <SidebarSurfaceTopNav
          rightSlot={
            <Button asChild className="rounded-full" size="sm">
              <Link href="/?mode=request">Post request</Link>
            </Button>
          }
          title="Open requests"
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={cn(surfaceScrollClassName, "gap-10")}>
              <section className="max-w-4xl space-y-5">
                <p className={surfaceEyebrowClassName}>Open requests</p>
                <h1 className={surfaceHeroTitleClassName}>
                  Browse the work people are trying to get done.
                </h1>
                <p className={surfaceBodyClassName}>
                  Every request shows the ask, status, proof needs, and next
                  action. Reading is free; credits apply only when Boreal has to
                  run work.
                </p>
              </section>

              <RequestBoard showIntro={false} variant="board" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
