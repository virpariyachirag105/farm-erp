import apiClient from '../api/client';
import { ModulePermissions, Permission } from '../types/rbac';

export const permissionService = {
  async getAll(): Promise<Permission[]> {
    const response = await apiClient.get<Permission[]>('/permissions/');
    return response.data;
  },

  async getByModule(): Promise<ModulePermissions[]> {
    const response = await apiClient.get<ModulePermissions[]>('/permissions/by-module');
    return response.data;
  },

  async getById(id: number): Promise<Permission> {
    const response = await apiClient.get<Permission>(`/permissions/${id}`);
    return response.data;
  },
};

export default permissionService;
