import { create } from "zustand";
import { AuthAPI } from "../api/endpoints/auth";
import type { LoginPayload } from "../api/endpoints/auth";
import { tokenVault } from "../shared/lib/tokenVault";
import type { Principal } from "../shared/schemas/auth.principal";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated" | "error";

type AuthState = {
  principal: Principal | null;
  status: AuthStatus;
  error: string | null;
  hydrated: boolean;

  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setPrincipal: (p: Principal | null) => void;
  clearError: () => void;

  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (perm: string) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  principal: null,
  status: "idle",
  error: null,
  hydrated: false,

  login: async (payload) => {
    set({ status: "loading", error: null });
    try {
      const { principal } = await AuthAPI.login(payload);
      set({ principal, status: "authenticated", error: null });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      set({ status: "error", error: msg, principal: null });
      return false;
    }
  },

  logout: async () => {
    set({ status: "loading" });
    try {
      await AuthAPI.logout();
    } finally {
      tokenVault.clearSession();
      set({ principal: null, status: "unauthenticated", error: null });
    }
  },

  restoreSession: async () => {
    if (get().hydrated) return;
    set({ status: "loading" });
    try {
      // Try to restore using existing access token
      const accessToken = tokenVault.getAccessToken();
      if (accessToken) {
        const principal = await AuthAPI.getSession();
        if (principal) {
          set({ principal, status: "authenticated", hydrated: true });
          return;
        }
      }

      // Try silent refresh via httpOnly cookie
      const newToken = await AuthAPI.refresh();
      if (newToken) {
        const principal = await AuthAPI.getSession();
        if (principal) {
          set({ principal, status: "authenticated", hydrated: true });
          return;
        }
      }

      set({ principal: null, status: "unauthenticated", hydrated: true });
    } catch {
      set({ principal: null, status: "unauthenticated", hydrated: true });
    }
  },

  setPrincipal: (principal) => set({ principal, status: principal ? "authenticated" : "unauthenticated" }),

  clearError: () => set({ error: null }),

  isAuthenticated: () => get().status === "authenticated" && get().principal !== null,

  isAdmin: () => {
    const p = get().principal;
    return p?.roles.some((r) => ["admin", "super_admin", "risk", "compliance"].includes(r)) ?? false;
  },

  hasRole: (role) => get().principal?.roles.includes(role) ?? false,

  hasPermission: (perm) => get().principal?.permissions.includes(perm) ?? false,
}));

export type { AuthState };
