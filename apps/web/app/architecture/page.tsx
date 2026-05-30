import {
  BoxesIcon,
  DatabaseIcon,
  FolderTreeIcon,
  Layers3Icon,
  MonitorSmartphoneIcon,
  RouteIcon,
  ShieldCheckIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { mvpArchitecture } from "@/lib/mvp-architecture";
import { buildPageMetadata } from "@/lib/seo";
import { jsonLdGraph, webPageJsonLd } from "@/lib/seo-jsonld";

const description =
  "Production MVP architecture for Boreal's request-native work commerce system.";

export const metadata: Metadata = buildPageMetadata({
  description,
  path: "/architecture",
  title: "Architecture",
});

const sectionIcons = {
  system: Layers3Icon,
  files: FolderTreeIcon,
  database: DatabaseIcon,
  api: RouteIcon,
  ui: MonitorSmartphoneIcon,
  scale: ShieldCheckIcon,
};

export default function ArchitecturePage() {
  return (
    <>
      <JsonLd
        data={jsonLdGraph([
          webPageJsonLd({
            description,
            name: "Boreal Architecture",
            path: "/architecture",
          }),
        ])}
      />
      <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/92 px-5 backdrop-blur md:px-8">
        <div className="mx-auto flex h-14 w-full max-w-[82rem] items-center justify-between gap-4">
          <Link
            className="text-[13px] font-medium text-foreground transition-colors hover:text-foreground/70"
            href="/"
          >
            Boreal
          </Link>
          <nav className="hidden items-center gap-4 text-[12px] font-medium text-muted-foreground lg:flex">
            <a className="transition-colors hover:text-foreground" href="#system">
              System
            </a>
            <a className="transition-colors hover:text-foreground" href="#database">
              Database
            </a>
            <a className="transition-colors hover:text-foreground" href="#api">
              API
            </a>
            <a className="transition-colors hover:text-foreground" href="#ui">
              UI
            </a>
            <a className="transition-colors hover:text-foreground" href="#scale">
              Scale
            </a>
          </nav>
          <Link
            className="rounded-md border border-border/70 px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-muted"
            href="/?mode=request"
          >
            Post request
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[82rem] flex-col gap-12 px-5 py-10 md:px-8 md:py-14">
        <section className="grid gap-8 border-b border-border/60 pb-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              <BoxesIcon className="size-4" />
              MVP system slice
            </div>
            <h1 className="mt-5 max-w-4xl text-[2.8rem] font-normal leading-[1.04] tracking-normal md:text-[4.25rem]">
              {mvpArchitecture.title}
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-8 text-muted-foreground">
              {mvpArchitecture.summary}
            </p>
          </div>

          <aside className="h-fit rounded-md border border-border/70 bg-muted/25 p-5">
            <div className="flex items-center gap-2 text-[12px] font-medium">
              <ShieldCheckIcon className="size-4" />
              Claim boundary
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {mvpArchitecture.boundary}
            </p>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mvpArchitecture.principles.map((principle) => (
            <div
              className="rounded-md border border-border/70 bg-background p-5 text-sm leading-7 text-muted-foreground"
              key={principle}
            >
              {principle}
            </div>
          ))}
        </section>

        <ArchitectureSection
          id="system"
          icon={sectionIcons.system}
          title="System Architecture"
          description="The MVP stays one governed product workspace, with typed domain modules between UI routes and durable storage."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {mvpArchitecture.layers.map((layer) => (
              <article
                className="rounded-md border border-border/70 bg-muted/20 p-5"
                key={layer.name}
              >
                <h3 className="text-base font-medium">{layer.name}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {layer.responsibility}
                </p>
                <p className="mt-3 text-sm leading-7 text-foreground/85">
                  {layer.productionRole}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {layer.components.map((component) => (
                    <code
                      className="rounded-md border border-border/60 bg-background px-2 py-1 text-[12px] text-muted-foreground"
                      key={component}
                    >
                      {component}
                    </code>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </ArchitectureSection>

        <ArchitectureSection
          id="files"
          icon={sectionIcons.files}
          title="File Structure"
          description="Code stays in governed workspaces. Root canon, schemas, tests, and fixtures remain the semantic control layer."
        >
          <div className="overflow-hidden rounded-md border border-border/70">
            {mvpArchitecture.fileStructure.map((entry) => (
              <div
                className="grid gap-3 border-b border-border/60 p-4 last:border-b-0 md:grid-cols-[17rem_minmax(0,1fr)]"
                key={entry.path}
              >
                <code className="text-[13px] text-foreground">{entry.path}</code>
                <p className="text-sm leading-7 text-muted-foreground">
                  {entry.responsibility}
                </p>
              </div>
            ))}
          </div>
        </ArchitectureSection>

        <ArchitectureSection
          id="database"
          icon={sectionIcons.database}
          title="Database Schema"
          description="The MVP schema keeps the current request state small while storing messages, files, payments, and events in their own records."
        >
          <div className="grid gap-4">
            {mvpArchitecture.databaseTables.map((table) => (
              <article
                className="rounded-md border border-border/70 bg-background p-5"
                key={table.table}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-medium">{table.table}</h3>
                  {table.canonicalObject ? (
                    <span className="rounded-md border border-border/70 px-2 py-1 text-[11px] text-muted-foreground">
                      {table.canonicalObject}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {table.responsibility}
                </p>
                <ul className="mt-4 grid gap-2 md:grid-cols-2">
                  {table.scaleNotes.map((note) => (
                    <li className="text-sm leading-7 text-foreground/80" key={note}>
                      {note}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </ArchitectureSection>

        <ArchitectureSection
          id="api"
          icon={sectionIcons.api}
          title="API Endpoints"
          description="Endpoints use canonical resource names and keep mutation behavior behind server-side authorization and idempotency rules."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {mvpArchitecture.apiEndpointGroups.map((group) => (
              <article
                className="rounded-md border border-border/70 bg-muted/20 p-5"
                key={group.group}
              >
                <h3 className="text-base font-medium">{group.group}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {group.responsibility}
                </p>
                <div className="mt-4 grid gap-2">
                  {group.endpoints.map((endpoint) => (
                    <code
                      className="rounded-md bg-background px-3 py-2 text-[12px] text-muted-foreground"
                      key={endpoint}
                    >
                      {endpoint}
                    </code>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </ArchitectureSection>

        <ArchitectureSection
          id="ui"
          icon={sectionIcons.ui}
          title="UI Architecture"
          description="The product starts as a usable request-commerce workspace, not a detached marketing wrapper."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mvpArchitecture.uiSurfaces.map((surface) => (
              <article
                className="rounded-md border border-border/70 bg-background p-5"
                key={surface.route}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-medium">{surface.surface}</h3>
                  <code className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                    {surface.route}
                  </code>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {surface.responsibility}
                </p>
              </article>
            ))}
          </div>
        </ArchitectureSection>

        <ArchitectureSection
          id="scale"
          icon={sectionIcons.scale}
          title="Production Scale Plan"
          description="The MVP is intentionally small, but its boundaries are chosen for stateless web scale, durable writes, replay safety, and provider isolation."
        >
          <div className="grid gap-4">
            {mvpArchitecture.productionHardening.map((entry) => (
              <article
                className="grid gap-4 rounded-md border border-border/70 bg-muted/20 p-5 lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,1fr)]"
                key={entry.area}
              >
                <h3 className="text-base font-medium">{entry.area}</h3>
                <p className="text-sm leading-7 text-muted-foreground">
                  {entry.currentBaseline}
                </p>
                <p className="text-sm leading-7 text-foreground/85">
                  {entry.scalePath}
                </p>
              </article>
            ))}
          </div>
        </ArchitectureSection>

        <footer className="flex flex-col gap-3 border-t border-border/60 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>Architecture source: `apps/web/lib/mvp-architecture.ts`.</span>
          <Link className="font-medium text-foreground hover:text-foreground/70" href="/">
            Back to Boreal
          </Link>
        </footer>
      </div>
      </main>
    </>
  );
}

function ArchitectureSection({
  children,
  description,
  icon: Icon,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: typeof Layers3Icon;
  id: string;
  title: string;
}) {
  return (
    <section className="scroll-mt-20 border-t border-border/60 pt-10" id={id}>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Icon className="size-4" />
            {title}
          </div>
          <h2 className="mt-3 text-[2rem] font-normal leading-tight tracking-normal md:text-[2.7rem]">
            {title}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
