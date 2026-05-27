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
              <Link href="/?mode=request">Start request</Link>
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
                  See what people are trying to get done.
                </h1>
                <p className={surfaceBodyClassName}>
                  Browse public requests, expected proof, current status, and
                  useful starting points. Reading is free; credits apply when
                  Boreal has to run work.
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
