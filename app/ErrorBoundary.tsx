import React from "react";

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("UI Crash:", error, info);
    // send to telemetry later
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-black text-red-500">
          <div>
            <h1 className="text-2xl font-bold">System Error</h1>
            <p>Frontend runtime failure detected.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}