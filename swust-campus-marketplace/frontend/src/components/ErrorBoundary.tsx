import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Something went wrong while loading the app.";
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught:", error, info.componentStack);
    }
  }

  private handleReload = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-6 py-16 text-[var(--color-ink)]">
        <div className="max-w-md text-center">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
            SWUST Marketplace
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-3 text-[var(--color-muted)]">
            An unexpected error stopped this page. You can return home and try
            again. If it keeps happening, check that the API is reachable.
          </p>
          {!import.meta.env.PROD ? (
            <p className="mt-4 rounded-md bg-black/5 px-3 py-2 text-left text-xs break-all">
              {this.state.message}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-8 inline-flex rounded-md bg-[var(--color-ink)] px-5 py-2.5 text-sm text-white"
            onClick={this.handleReload}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }
}
