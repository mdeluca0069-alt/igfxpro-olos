import { ReactNode, useEffect, useState } from "react";
import { z } from "zod";
import { apiClient } from "../api/axios";
import { getClientEnv } from "../shared/config/clientEnv";

type Props = {
  children: ReactNode;
};

const MaintenanceResponse = z.object({
  enabled: z.boolean(),
});

export function MaintenanceGuard({ children }: Props) {
  const env = getClientEnv();
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await apiClient.get(env.MAINTENANCE_PATH);
        const parsed = MaintenanceResponse.safeParse(res.data);
        setMaintenance(parsed.success ? parsed.data.enabled : false);
      } catch {
        setMaintenance(false);
      }
    };

    void checkMaintenance();
  }, []);

  if (maintenance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div className="max-w-md border border-slate-800 bg-[#0b1020] p-8">
          <h1 className="text-lg font-semibold">Manutenzione programmata</h1>
          <p className="mt-2 text-sm text-slate-400">
            L&apos;infrastruttura è temporaneamente non disponibile.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
