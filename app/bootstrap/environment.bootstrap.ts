/**
 * Validates required client configuration before the app mounts.
 * Extend with Zod or similar when backend contracts stabilize.
 */
export async function initializeEnvironment(): Promise<void> {
  const mode = import.meta.env.MODE;
  if (!mode) {
    throw new Error("MODE is not defined");
  }
}
