import { cookies } from "next/headers";
import Script from "next/script";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { AppSidebar } from "@/components/chat/app-sidebar";
import { DataStreamProvider } from "@/components/chat/data-stream-provider";
import { ModeShell } from "@/components/chat/mode-shell";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ActiveChatProvider } from "@/hooks/use-active-chat";
import { auth } from "../(auth)/auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="lazyOnload"
      />
      <DataStreamProvider>
        <Suspense fallback={<ChatShellFallback />}>
          <SidebarShell>{children}</SidebarShell>
        </Suspense>
      </DataStreamProvider>
    </>
  );
}

async function SidebarShell({ children }: { children: React.ReactNode }) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={session?.user} />
      <SidebarInset>
        <Toaster
          position="top-center"
          theme="system"
          toastOptions={{
            className:
              "!bg-card !text-foreground !border-border/50 !shadow-[var(--shadow-float)]",
          }}
        />
        <Suspense fallback={<ChatShellFallback compact />}>
          <ActiveChatProvider>
            <ModeShell user={session?.user} />
          </ActiveChatProvider>
        </Suspense>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

function ChatShellFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex h-dvh w-full bg-sidebar text-sidebar-foreground">
      {!compact ? (
        <div className="hidden w-64 shrink-0 border-r border-sidebar-border/70 p-3 md:block">
          <div className="h-9 w-28 animate-pulse rounded-full bg-sidebar-accent/70" />
          <div className="mt-7 space-y-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                className="h-9 animate-pulse rounded-2xl bg-sidebar-accent/55"
                key={item}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between gap-4">
            <div className="h-7 w-52 animate-pulse rounded-full bg-muted/70" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-muted/60" />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[84rem] flex-1 flex-col gap-4 px-4 py-5 md:px-6">
          <div className="h-24 animate-pulse rounded-[24px] border border-border/60 bg-muted/45" />
          <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,25rem)]">
            <div className="min-h-[28rem] animate-pulse rounded-[24px] border border-border/60 bg-muted/35" />
            <div className="min-h-[28rem] animate-pulse rounded-[24px] border border-border/60 bg-muted/45" />
          </div>
        </div>
      </div>
    </div>
  );
}
