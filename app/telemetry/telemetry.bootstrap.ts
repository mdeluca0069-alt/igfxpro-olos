export async function initializeTelemetry(): Promise<void> {
  if (import.meta.env.DEV) {
    console.info("[telemetry] dev mode — exporters disabled");
  }
}
