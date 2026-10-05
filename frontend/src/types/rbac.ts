export interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
  description?: string | null;
}

export interface ModulePermissions {
  module: string;
  permissions: Permission[];
}

export interface Role {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  permissions?: Permission[];
}

export interface RoleRequest {
  name: string;
  description?: string | null;
  is_active?: boolean;
  permission_ids?: number[];
}

export interface AssignPermissionsRequest {
  permission_ids: number[];
}
