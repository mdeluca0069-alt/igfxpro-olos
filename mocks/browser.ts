import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

const VITE_MSW_ENABLED = import.meta.env.VITE_MSW_ENABLED;

if (import.meta.env.PROD && VITE_MSW_ENABLED === 'true') {
  throw new Error('MSW cannot run in production');
}

export const worker = setupWorker(...handlers);
