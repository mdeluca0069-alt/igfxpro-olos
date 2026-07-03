import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./index.css";

if (import.meta.env.PROD && import.meta.env.VITE_MSW_ENABLED === "true") {
  throw new Error(
    "[MSW] Mock Service Worker must not run in production. " +
    "Remove VITE_MSW_ENABLED=true from your production environment."
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
