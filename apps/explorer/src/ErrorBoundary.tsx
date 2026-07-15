import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Explorer render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui,sans-serif", maxWidth: 720 }}>
          <h1 style={{ color: "#b91c1c", fontSize: "1.25rem" }}>Something broke in the explorer UI</h1>
          <p style={{ color: "#334155", marginTop: 8 }}>
            Open DevTools (F12) → Console and share the red error. Common fixes: hard refresh (Ctrl+Shift+R), restart{" "}
            <code>npm run dev</code> in <code>apps/explorer</code>.
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: "#f1f5f9",
              borderRadius: 8,
              overflow: "auto",
              fontSize: 12,
              color: "#0f172a",
            }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
