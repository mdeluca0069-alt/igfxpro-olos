import { useEffect } from "react";

type PreloadRoute = () => Promise<any>;

interface RoutePreloaderProps {
  routes: PreloadRoute[];
  enabled?: boolean;
}

export const RoutePreloader = ({
  routes,
  enabled = true,
}: RoutePreloaderProps) => {
  useEffect(() => {
    if (!enabled) return;

    const preload = async () => {
      try {
        await Promise.all(
          routes.map((route) => route().catch(() => null))
        );
      } catch (err) {
        console.warn("Route preloading error:", err);
      }
    };

    preload();

    return () => {};
  }, [routes, enabled]);

  return null;
};