import { User } from '../types/auth';

/**
 * Checks if a user is an administrator with universal permissions.
 */
export const isUserAdmin = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.role_id === 1) return true;
  const roleName = (user.role || '').toUpperCase();
  const relRoleName = (user.role_rel?.name || '').toUpperCase();
  return (
    ['ADMIN', 'SUPERADMIN'].includes(roleName) ||
    ['ADMIN', 'SUPERADMIN'].includes(relRoleName)
  );
};

/**
 * Checks if the user has a specific permission or matches a wildcard rule.
 * If permission is an array, returns true if user has AT LEAST ONE matching permission.
 */
export const checkPermission = (
  user: User | null | undefined,
  permission: string | string[]
): boolean => {
  if (!user || !user.is_active) return false;
  if (isUserAdmin(user)) return true;

  const userPerms = user.permissions || [];
  if (userPerms.includes('*')) return true;

  const permsToCheck = Array.isArray(permission) ? permission : [permission];

  return permsToCheck.some((perm) => {
    if (userPerms.includes(perm)) return true;

    // Check module wildcard (e.g., 'farm.*')
    const module = perm.split('.')[0];
    if (module && userPerms.includes(`${module}.*`)) return true;

    return false;
  });
};

/**
 * Checks if the user has ALL of the specified permissions.
 */
export const checkAllPermissions = (
  user: User | null | undefined,
  permissions: string[]
): boolean => {
  if (!user || !user.is_active) return false;
  if (isUserAdmin(user)) return true;

  const userPerms = user.permissions || [];
  if (userPerms.includes('*')) return true;

  return permissions.every((perm) => checkPermission(user, perm));
};

/**
 * Checks if the user has access to a module (any permission in that module).
 */
export const checkModuleAccess = (
  user: User | null | undefined,
  module: string
): boolean => {
  if (!user || !user.is_active) return false;
  if (isUserAdmin(user)) return true;

  const userPerms = user.permissions || [];
  if (userPerms.includes('*')) return true;

  const modulePrefix = `${module}.`;
  return userPerms.some((p) => p === module || p === `${module}.*` || p.startsWith(modulePrefix));
};

/**
 * Convenience action checker.
 * e.g., canUser(user, 'create', 'dealer') -> checks 'dealer.create'
 *       canUser(user, 'edit', 'dealer') -> checks 'dealer.update'
 *       canUser(user, 'delete', 'dealer') -> checks 'dealer.delete'
 *       canUser(user, 'view', 'dealer') -> checks 'dealer.view'
 */
export const canUser = (
  user: User | null | undefined,
  action:
    | 'create'
    | 'edit'
    | 'update'
    | 'delete'
    | 'view'
    | 'list'
    | 'upload_image'
    | 'assign_permissions'
    | string,
  module: string
): boolean => {
  let normalizedAction = action.toLowerCase();
  if (normalizedAction === 'edit') normalizedAction = 'update';

  const primaryPerm = `${module}.${normalizedAction}`;
  return checkPermission(user, primaryPerm);
};
