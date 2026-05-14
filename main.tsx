import React from "react";
import ReactDOM from "react-dom/client";
import { getClientEnv } from "./shared/config/clientEnv";
import { BootLoader } from "./app/BootLoader";
import { ErrorBoundary } from "./app/ErrorBoundary";
import "./index.css";

getClientEnv();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BootLoader />
    </ErrorBoundary>
  </React.StrictMode>
);
