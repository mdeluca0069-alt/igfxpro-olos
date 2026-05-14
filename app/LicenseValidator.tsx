import { ReactNode, useEffect, useState } from "react";
import { z } from "zod";
import { apiClient } from "../api/axios";
import { getClientEnv } from "../shared/config/clientEnv";

type Props = {
  children: ReactNode;
};

const LicenseResponse = z.object({
  valid: z.boolean(),
});

export function LicenseValidator({ children }: Props) {
  const env = getClientEnv();
  const strict = env.STRICT_LICENSE === true;

  const [valid, setValid] = useState(!strict);

  useEffect(() => {
    const env = getClientEnv();
    const validateLicense = async () => {
      try {
        const res = await apiClient.get(env.LICENSE_VALIDATE_PATH);
        const parsed = LicenseResponse.safeParse(res.data);
        setValid(parsed.success ? parsed.data.valid : false);
      } catch {
        setValid(!strict);
      }
    };

    void validateLicense();
  }, [strict]);

  if (!valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-red-400">
        <div className="max-w-md border border-red-900/40 bg-[#0b1020] p-8">
          <h1 className="text-lg font-semibold">Licenza non valida</h1>
          <p className="mt-2 text-sm text-slate-400">
            Il gateway licenze ha negato l&apos;accesso a questo terminale.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
