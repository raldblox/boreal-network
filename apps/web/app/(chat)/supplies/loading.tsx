export default function Loading() {
  return (
    <div className="flex h-dvh flex-col bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.28)_100%)]">
      <div className="border-b border-border/50 bg-background/92 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto h-8 w-full max-w-6xl animate-pulse rounded-2xl bg-muted/70" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
        <div className="h-6 w-28 animate-pulse rounded-full bg-muted/70" />
        <div className="h-16 max-w-2xl animate-pulse rounded-[28px] bg-muted/60" />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2].map((item) => (
            <div
              className="h-48 animate-pulse rounded-[28px] border border-border/60 bg-background/88"
              key={item}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
