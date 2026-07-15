import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import "./preflight.css";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.textContent = "Fatal: #root element missing from index.html";
} else {
  try {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    );
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
    rootEl.textContent = `Failed to start React: ${msg}`;
    console.error(e);
  }
}
