import { ReactNode, useEffect, useState } from "react";

type Props = {
  children: ReactNode;
};

export function MaintenanceGuard({
  children,
}: Props) {
  const [maintenance, setMaintenance] =
    useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await fetch(
          "/api/system/maintenance"
        );

        const data = await response.json();

        setMaintenance(data.enabled);
      } catch {
        setMaintenance(false);
      }
    };

    checkMaintenance();
  }, []);

  if (maintenance) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-white">
        System under maintenance
      </div>
    );
  }

  return <>{children}</>;
}