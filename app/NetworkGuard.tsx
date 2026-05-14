import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

type NetworkStatus =
  | "ONLINE"
  | "DEGRADED"
  | "OFFLINE";

type NetworkContextState = {
  status: NetworkStatus;
  latency: number;
  reconnecting: boolean;
};

const NetworkContext =
  createContext<NetworkContextState | null>(null);

type Props = {
  children: ReactNode;
};

export function NetworkGuard({ children }: Props) {
  const [status, setStatus] =
    useState<NetworkStatus>("ONLINE");

  const [latency, setLatency] = useState(0);

  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const checkConnection = async () => {
      const start = performance.now();

      try {
        await fetch("/health", { method: "HEAD", cache: "no-store" });

        const end = performance.now();

        const ping = end - start;

        setLatency(ping);

        if (ping > 2000) {
          setStatus("DEGRADED");
        } else {
          setStatus("ONLINE");
        }
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setStatus("OFFLINE");
          setReconnecting(true);
        } else {
          setLatency(0);
          setStatus("ONLINE");
        }
      }
    };

    interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, []);

  const value = useMemo(
    () => ({
      status,
      latency,
      reconnecting,
    }),
    [status, latency, reconnecting]
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);

  if (!context) {
    throw new Error(
      "useNetwork must be used inside NetworkGuard"
    );
  }

  return context;
}