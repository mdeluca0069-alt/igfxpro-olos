import { ReactNode } from "react";
import { useTier } from "./TierProvider";
import { useTenant } from "./TenantProvider";
import { useFeatureFlags } from "./FeatureFlagProvider";

interface NavItem {
  path: string;
  element: ReactNode;
  tier?: string[];
  featureFlag?: string;
}

interface NavigationProps {
  routes: NavItem[];
}

export const Navigation = ({ routes }: NavigationProps) => {
  const { tier } = useTier();
  const { tenant } = useTenant();
  const { isEnabled } = useFeatureFlags();

  const allowedRoutes = routes.filter((route) => {
    if (route.tier && !route.tier.includes(tier)) return false;
    if (route.featureFlag && !isEnabled(route.featureFlag)) return false;
    return true;
  });

  return (
    <>
      {allowedRoutes.map((route) => (
        <div
          key={`${tenant.id}-${route.path}`}
          data-route={route.path}
          data-tenant={tenant.slug}
        >
          {route.element}
        </div>
      ))}
    </>
  );
};