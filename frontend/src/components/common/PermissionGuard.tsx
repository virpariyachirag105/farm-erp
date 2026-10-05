import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGuardProps {
  permission?: string | string[];
  module?: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  module,
  action,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasModuleAccess, can } = useAuth();

  let hasAccess = false;

  if (action && module) {
    hasAccess = can(action, module);
  } else if (module) {
    hasAccess = hasModuleAccess(module);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
