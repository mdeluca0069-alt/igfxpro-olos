import { z } from "zod";

export const TenantInfoSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  region: z.string().min(1),
  branding: z
    .object({
      accent: z.string().min(1),
      logoUrl: z.string().optional(),
    })
    .default({ accent: "#22d3ee" }),
});

export type TenantInfo = z.infer<typeof TenantInfoSchema>;

export function parseTenantPayload(raw: unknown): TenantInfo | null {
  const direct = TenantInfoSchema.safeParse(raw);
  if (direct.success) return direct.data;

  const wrappedTenant = z
    .object({ tenant: TenantInfoSchema })
    .safeParse(raw);
  if (wrappedTenant.success) return wrappedTenant.data.tenant;

  const wrappedData = z
    .object({ data: TenantInfoSchema })
    .safeParse(raw);
  if (wrappedData.success) return wrappedData.data.data;

  return null;
}

export const FALLBACK_TENANT: TenantInfo = {
  id: "tenant_fallback",
  slug: "default",
  name: "Default tenant",
  region: "undetermined",
  branding: { accent: "#22d3ee" },
};
