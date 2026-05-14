// frontend/app/ServiceHealthChecker.tsx

import React, { useEffect, useMemo, useState } from "react";

/**
 * =========================================================
 * TYPES
 * =========================================================
 */

type ServiceStatus =
  | "operational"
  | "degraded"
  | "offline";

interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency: number;
  lastHeartbeat: number;
}

interface HealthState {
  services: ServiceHealth[];
}

/**
 * =========================================================
 * MOCK SERVICE CHECKERS
 * Replace with real API checks
 * =========================================================
 */

const checkService = async (
  serviceName: string
): Promise<ServiceHealth> => {
  const latency = Math.floor(Math.random() * 200);

  return {
    name: serviceName,
    status:
      latency < 100
        ? "operational"
        : latency < 160
        ? "degraded"
        : "offline",
    latency,
    lastHeartbeat: Date.now(),
  };
};

/**
 * =========================================================
 * SERVICES
 * =========================================================
 */

const SERVICES = [
  "api-gateway",
  "websocket",
  "market-stream",
  "execution-engine",
  "ai-engine",
  "calendar-service",
  "notification-service",
  "auth-service",
];

/**
 * =========================================================
 * STATUS COLOR
 * =========================================================
 */

const getStatusColor = (status: ServiceStatus) => {
  switch (status) {
    case "operational":
      return "bg-green-500";

    case "degraded":
      return "bg-yellow-500";

    case "offline":
      return "bg-red-500";

    default:
      return "bg-gray-500";
  }
};

/**
 * =========================================================
 * COMPONENT
 * =========================================================
 */

export const ServiceHealthChecker: React.FC = () => {
  const [healthState, setHealthState] =
    useState<HealthState>({
      services: [],
    });

  /**
   * =========================================================
   * HEARTBEAT LOOP
   * =========================================================
   */

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const monitorServices = async () => {
      const results = await Promise.all(
        SERVICES.map((service) =>
          checkService(service)
        )
      );

      setHealthState({
        services: results,
      });
    };

    monitorServices();

    interval = setInterval(monitorServices, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /**
   * =========================================================
   * GLOBAL STATUS
   * =========================================================
   */

  const globalStatus = useMemo(() => {
    if (
      healthState.services.some(
        (s) => s.status === "offline"
      )
    ) {
      return "offline";
    }

    if (
      healthState.services.some(
        (s) => s.status === "degraded"
      )
    ) {
      return "degraded";
    }

    return "operational";
  }, [healthState]);

  /**
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[340px] rounded-2xl bg-[#0B1020] border border-[#1E293B] shadow-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-white font-semibold">
            Service Health
          </h2>

          <p className="text-xs text-gray-400">
            Realtime infrastructure monitor
          </p>
        </div>

        <div
          className={`w-3 h-3 rounded-full ${getStatusColor(
            globalStatus
          )}`}
        />
      </div>

      <div className="space-y-3">
        {healthState.services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between"
          >
            <div>
              <div className="text-sm text-white">
                {service.name}
              </div>

              <div className="text-xs text-gray-500">
                {service.latency}ms
              </div>
            </div>

            <div
              className={`w-2 h-2 rounded-full ${getStatusColor(
                service.status
              )}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceHealthChecker;