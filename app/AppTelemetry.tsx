import { ReactNode, useEffect } from "react";

type Props = {
  children?: ReactNode;
};

export function AppTelemetry({ children }: Props) {
  useEffect(() => {
    const memoryMonitor = () => {
      const memory = (performance as any).memory;

      if (memory) {
        console.log("Memory Usage", {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
        });
      }
    };

    const fpsMonitor = () => {
      let lastFrame = performance.now();

      const loop = () => {
        const now = performance.now();

        const delta = now - lastFrame;

        if (delta > 100) {
          console.warn("Frame drop detected");
        }

        lastFrame = now;

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    };

    memoryMonitor();
    fpsMonitor();
  }, []);

  return <>{children}</>;
}