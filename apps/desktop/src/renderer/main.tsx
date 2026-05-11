import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

type RendererErrorBoundaryProps = {
  children: ReactNode;
};

type RendererErrorBoundaryState = {
  errorMessage: string | null;
};

class RendererErrorBoundary extends Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  state: RendererErrorBoundaryState = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : "Desktop renderer crashed before the shell could render.",
    };
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-8 text-foreground">
          <div className="mx-auto max-w-3xl rounded-xl border border-destructive/20 bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">
              Renderer crash
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Boreal Desktop</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {this.state.errorMessage}
            </p>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Desktop root element not found.");
}

document.documentElement.classList.add("dark");
document.body.classList.add("dark");

createRoot(root).render(
  <RendererErrorBoundary>
    <App />
  </RendererErrorBoundary>,
);
