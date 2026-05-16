"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  borealHomepageCopy,
  borealMissionPoints,
  borealVisionPoints,
  borealWhitelistTracks,
} from "@/lib/marketing";
import {
  buildSurfaceTopNavLinks,
  SidebarSurfaceTopNav,
} from "./surface-top-nav";

export function HomePage() {
  const [missionBias, missionMissing, missionWhy] = borealMissionPoints;

  return (
    <div className="flex h-dvh w-full flex-row overflow-hidden bg-sidebar">
      <div className="flex min-w-0 flex-1 flex-col bg-transparent">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0d0d0d] text-[#e5e5e5] md:rounded-none md:rounded-tl-[28px] md:border md:border-white/8 md:shadow-[0_18px_55px_rgba(0,0,0,0.24)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[#0d0d0d]" />
            <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(rgba(229,229,229,0.92)_0.7px,transparent_0.7px)] [background-position:0_0] [background-size:22px_22px]" />
          </div>

          <SidebarSurfaceTopNav
            links={buildSurfaceTopNavLinks("home")}
            subtitle="Home"
          />

          <div className="relative flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-[80rem] flex-col px-6 py-10 md:px-10 md:py-14 xl:px-12">
              <section
                className="scroll-mt-20 border-b border-white/8 pb-14 md:pb-20"
                id="hero"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a3a3a3]">
                  {borealHomepageCopy.eyebrow}
                </p>

                <h1 className="mt-8 max-w-4xl text-[3.5rem] font-normal leading-[1.08] tracking-[-0.012em] [font-family:var(--font-display)] md:text-[5.25rem] xl:text-[6rem]">
                  {borealHomepageCopy.title}
                </h1>

                <p className="mt-8 max-w-2xl text-[15px] leading-8 text-[#a3a3a3]">
                  {borealHomepageCopy.body}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    className="h-11 rounded-none border border-white bg-white px-5 text-[12px] font-medium uppercase tracking-[0.16em] text-black hover:bg-zinc-100"
                  >
                    <Link href="/?mode=request">Request a pilot</Link>
                  </Button>
                  <Button
                    asChild
                    className="h-11 rounded-none border border-white/18 bg-transparent px-5 text-[12px] font-medium uppercase tracking-[0.16em] text-zinc-100 hover:bg-white/[0.04]"
                    variant="outline"
                  >
                    <Link href="/supplies/new?entry=whitelist">
                      Join the whitelist
                    </Link>
                  </Button>
                </div>

                <p className="mt-8 max-w-3xl text-sm leading-7 text-[#a3a3a3]">
                  {borealHomepageCopy.support}
                </p>
              </section>

              <section
                className="scroll-mt-20 border-b border-white/8 py-14 md:py-16"
                id="mission"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a3a3a3]">
                  Mission
                </p>
                <h2 className="mt-5 max-w-5xl text-[2.2rem] font-normal leading-[1.12] tracking-[-0.012em] [font-family:var(--font-display)] md:text-[3rem]">
                  Serious work breaks when the system deletes the human steps.
                </h2>

                <div className="mt-10 grid gap-8 border-t border-white/8 pt-8 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a3a3a3]">
                      {missionBias.label}
                    </p>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-[#a3a3a3]">
                      {missionBias.body}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a3a3a3]">
                      {missionMissing.label}
                    </p>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-[#a3a3a3]">
                      {missionMissing.body}
                    </p>
                  </div>
                </div>

                <div className="mt-8 border border-white/8 bg-[#171717] px-6 py-6">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a3a3a3]">
                    {missionWhy.label}
                  </p>
                  <p className="mt-4 max-w-4xl text-[15px] leading-8 text-[#e5e5e5]">
                    {missionWhy.body}
                  </p>
                </div>
              </section>

              <section
                className="scroll-mt-20 border-b border-white/8 py-14 md:py-16"
                id="vision"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a3a3a3]">
                  Vision
                </p>
                <h2 className="mt-5 max-w-5xl text-[2.2rem] font-normal leading-[1.12] tracking-[-0.012em] [font-family:var(--font-display)] md:text-[3rem]">
                  We want AI to unlock complete work, not just better drafts.
                </h2>

                <div className="mt-10 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {borealVisionPoints.map((point) => (
                    <div
                      key={point.label}
                      className="border-t border-white/8 pt-6"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a3a3a3]">
                        {point.label}
                      </p>
                      <p className="mt-4 max-w-sm text-sm leading-7 text-[#a3a3a3]">
                        {point.body}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="scroll-mt-20 py-14 md:py-16" id="whitelist">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#a3a3a3]">
                  Whitelist
                </p>
                <h2 className="mt-5 max-w-5xl text-[2.2rem] font-normal leading-[1.12] tracking-[-0.012em] [font-family:var(--font-display)] md:text-[3rem]">
                  Opening in two tracks while we prove the real workflows.
                </h2>

                <div className="mt-10 grid gap-5 lg:grid-cols-2">
                  {borealWhitelistTracks.map((track) => (
                    <div
                      key={track.label}
                      className="border border-white/8 bg-[#171717] px-6 py-7 md:px-7 md:py-8"
                    >
                      <h3 className="text-[1.9rem] font-normal leading-[1.08] tracking-[-0.01em] [font-family:var(--font-display)]">
                        {track.label}
                      </h3>

                      <p className="mt-6 max-w-md text-sm leading-7 text-[#a3a3a3]">
                        {track.body}
                      </p>

                      <Link
                        className="mt-10 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-[#e5e5e5] transition-colors hover:text-white"
                        href={track.href}
                      >
                        {track.cta}
                        <ArrowRightIcon className="size-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              </section>

              <footer className="border-t border-white/8 py-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="text-[1.45rem] font-normal leading-none tracking-[-0.01em] [font-family:var(--font-display)]">
                    Boreal
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-[#a3a3a3]">
                    <Link href="/">Home</Link>
                    <Link href="/?mode=request">Post request</Link>
                    <Link href="/supplies/new?entry=whitelist">
                      Supply whitelist
                    </Link>
                    <Link href="/download/boreal-desktop">Desktop</Link>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
