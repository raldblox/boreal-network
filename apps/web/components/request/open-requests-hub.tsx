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
          title="Request Board"
        />

        <div className={surfaceShellClassName}>
          <div className={surfaceViewportClassName}>
            <div className={cn(surfaceScrollClassName, "gap-10")}>
              <section className="max-w-4xl space-y-5">
                <p className={surfaceEyebrowClassName}>Public demand pool</p>
                <h1 className={surfaceHeroTitleClassName}>
                  Search public Requests before starting from scratch.
                </h1>
                <p className={surfaceBodyClassName}>
                  The board keeps demand, readiness, route hints, proof
                  expectations, and next actions centered on the Request.
                  Public context is free to inspect; credits matter when work
                  executes.
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
