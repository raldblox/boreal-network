import { useEffect, useState } from "react";
import { Badge, Button, Separator } from "@boreal/ui";

type ShellInfo = {
  name: string;
  platform: string;
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
};

declare global {
  interface Window {
    borealDesktop: {
      getShellInfo: () => Promise<ShellInfo>;
    };
  }
}

export function App() {
  const [shellInfo, setShellInfo] = useState<ShellInfo | null>(null);

  useEffect(() => {
    window.borealDesktop.getShellInfo().then(setShellInfo);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Desktop shell</Badge>
              <Badge variant="outline">Windows-first</Badge>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Boreal Desktop
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Electron scaffold for Boreal&apos;s local execution and operator
                surface. Web stays the product system of record.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary">Connect runtime</Button>
            <Button>Open queue</Button>
          </div>
        </header>

        <Separator className="my-8" />

        <section className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Scaffold state
              </p>
              <h2 className="text-xl font-semibold">Desktop execution lane</h2>
              <p className="text-sm text-muted-foreground">
                Renderer is live, preload bridge is active, and the workspace is
                ready for shared Boreal UI plus future runtime-specific flows.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Shell info
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">App</span>
                <span>{shellInfo?.name ?? "Loading..."}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Platform</span>
                <span>{shellInfo?.platform ?? "Loading..."}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Electron</span>
                <span>{shellInfo?.versions.electron ?? "Loading..."}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Chrome</span>
                <span>{shellInfo?.versions.chrome ?? "Loading..."}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Node</span>
                <span>{shellInfo?.versions.node ?? "Loading..."}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
