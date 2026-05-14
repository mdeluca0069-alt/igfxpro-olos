import { ReactNode, useEffect, useState } from "react";

type Props = {
  children: ReactNode;
};

export function LicenseValidator({
  children,
}: Props) {
  const strict =
    import.meta.env.VITE_STRICT_LICENSE === "true";

  const [valid, setValid] = useState(!strict);

  useEffect(() => {
    const validateLicense = async () => {
      try {
        const response = await fetch(
          "/api/license/validate"
        );

        const data = await response.json();

        setValid(data.valid);
      } catch {
        setValid(!strict);
      }
    };

    validateLicense();
  }, [strict]);

  if (!valid) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-red-500">
        Invalid License
      </div>
    );
  }

  return <>{children}</>;
}