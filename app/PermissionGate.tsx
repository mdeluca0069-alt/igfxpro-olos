// frontend/app/PermissionGate.tsx

import React from "react";

/**
 * =========================================================
 * IMPORTS
 * =========================================================
 */

import { useAuth } from "./AuthGate";

/**
 * =========================================================
 * TYPES
 * =========================================================
 */

interface PermissionGateProps {
  permissions?: string[];
  roles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * =========================================================
 * COMPONENT
 * =========================================================
 */

export const PermissionGate: React.FC<
  PermissionGateProps
> = ({
  permissions = [],
  roles = [],
  fallback = null,
  children,
}) => {
  const { user } = useAuth();

  /**
   * =========================================================
   * NO USER
   * =========================================================
   */

  if (!user) {
    return <>{fallback}</>;
  }

  /**
   * =========================================================
   * ROLE CHECK
   * =========================================================
   */

  const roleAllowed =
    roles.length === 0 ||
    roles.includes(user.role);

  /**
   * =========================================================
   * PERMISSION CHECK
   * =========================================================
   */

  const permissionAllowed =
    permissions.length === 0 ||
    permissions.every((permission) =>
      user.permissions.includes(permission)
    );

  /**
   * =========================================================
   * DENIED
   * =========================================================
   */

  if (!roleAllowed || !permissionAllowed) {
    return <>{fallback}</>;
  }

  /**
   * =========================================================
   * ALLOWED
   * =========================================================
   */

  return <>{children}</>;
};

export default PermissionGate;