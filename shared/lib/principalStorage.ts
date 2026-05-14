import type { Principal } from "../schemas/auth.principal";
import { PrincipalSchema } from "../schemas/auth.principal";

export const PRINCIPAL_STORAGE_KEY = "olos.terminal.principal.v1";

export const PRINCIPAL_CHANGED_EVENT = "olos:principal-changed";

export function readStoredPrincipal(): Principal | null {
  try {
    const raw = sessionStorage.getItem(PRINCIPAL_STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    const parsed = PrincipalSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeStoredPrincipal(principal: Principal | null): void {
  try {
    if (principal === null) {
      sessionStorage.removeItem(PRINCIPAL_STORAGE_KEY);
    } else {
      sessionStorage.setItem(
        PRINCIPAL_STORAGE_KEY,
        JSON.stringify(PrincipalSchema.parse(principal))
      );
    }
    window.dispatchEvent(new Event(PRINCIPAL_CHANGED_EVENT));
  } catch {
    /* sessionStorage unavailable */
  }
}
