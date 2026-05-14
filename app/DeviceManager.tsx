import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

type PerformanceTier =
  | "LOW_END"
  | "MID_RANGE"
  | "HIGH_END"
  | "INSTITUTIONAL";

type DeviceContextState = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  cores: number;
  memory: number;
  performanceTier: PerformanceTier;
};

const DeviceContext = createContext<DeviceContextState | null>(
  null
);

type Props = {
  children: ReactNode;
};

export function DeviceManager({ children }: Props) {
  const [deviceState, setDeviceState] =
    useState<DeviceContextState>({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      cores: 4,
      memory: 4,
      performanceTier: "MID_RANGE",
    });

  useEffect(() => {
    const width = window.innerWidth;

    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1280;
    const isDesktop = width >= 1280;

    const cores = navigator.hardwareConcurrency || 4;

    const memory = (navigator as any).deviceMemory || 4;

    let performanceTier: PerformanceTier = "MID_RANGE";

    if (cores <= 4 || memory <= 4) {
      performanceTier = "LOW_END";
    }

    if (cores >= 8 && memory >= 8) {
      performanceTier = "HIGH_END";
    }

    if (cores >= 16 && memory >= 16) {
      performanceTier = "INSTITUTIONAL";
    }

    setDeviceState({
      isMobile,
      isTablet,
      isDesktop,
      cores,
      memory,
      performanceTier,
    });
  }, []);

  const value = useMemo(() => deviceState, [deviceState]);

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);

  if (!context) {
    throw new Error(
      "useDevice must be used inside DeviceManager"
    );
  }

  return context;
}