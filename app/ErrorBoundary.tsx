import React from "react";

interface State {
  hasError: boolean;
  error?: Error;
  autoReloading: boolean;
}

/** Returns true for chunk-not-found errors caused by Vite HMR hash changes. */
function isChunkLoadError(error: Error): boolean {
  return (
    error.message.includes("Failed to fetch dynamically imported module") ||
    error.message.includes("Importing a module script failed") ||
    error.message.includes("Unable to preload CSS for") ||
    error.name === "ChunkLoadError"
  );
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, autoReloading: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Chunk-load errors (stale Vite hash after HMR) are transient.
    // Flag them so we can auto-reload instead of showing the error screen.
    return {
      hasError: true,
      error,
      autoReloading: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("UI Crash:", error, info);

    if (isChunkLoadError(error)) {
      // Auto-reload after 1 s to recover from stale chunk hash (Vite HMR side effect).
      // Clear any previous timer to avoid double-reload.
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => {
        window.location.reload();
      }, 1_000);
    }
  }

  componentWillUnmount() {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // Chunk-load error: show minimal reload message instead of scary error screen.
    if (this.state.autoReloading) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#05070d] p-6 text-center">
          <div>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="text-sm font-semibold text-cyan-300">Aggiornamento in corso…</p>
            <p className="mt-1 text-xs text-slate-500">La pagina si ricarica automaticamente.</p>
          </div>
        </div>
      );
    }

    // Real application error: show details + manual reload button.
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black p-6 text-red-500">
        <div className="max-w-xl w-full">
          <h1 className="mb-4 text-3xl font-bold">System Error</h1>
          <p className="mb-3">Frontend runtime failure detected.</p>
          <div className="rounded-lg border border-red-500 bg-slate-900 p-4 text-sm text-slate-200">
            <div className="mb-2 font-semibold text-red-400">Error message:</div>
            <pre className="whitespace-pre-wrap break-words">
              {this.state.error?.message ?? "Unknown error"}
            </pre>
            {this.state.error?.stack ? (
              <details className="mt-3 text-xs text-slate-400">
                <summary className="cursor-pointer">Stack trace</summary>
                <pre className="whitespace-pre-wrap break-words">{this.state.error.stack}</pre>
              </details>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
          >
            ↺ Ricarica pagina
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/login")}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            → Vai al login
          </button>
        </div>
      </div>
    );
  }
}
