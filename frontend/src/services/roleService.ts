import apiClient from '../api/client';
import { AssignPermissionsRequest, Role, RoleRequest } from '../types/rbac';

export const roleService = {
  async getAll(): Promise<Role[]> {
    const response = await apiClient.get<Role[]>('/roles/');
    return response.data;
  },

  async getById(id: number): Promise<Role> {
    const response = await apiClient.get<Role>(`/roles/${id}`);
    return response.data;
  },

  async create(data: RoleRequest): Promise<Role> {
    const response = await apiClient.post<Role>('/roles/', data);
    return response.data;
  },

  async update(id: number, data: RoleRequest): Promise<Role> {
    const response = await apiClient.put<Role>(`/roles/${id}`, data);
    return response.data;
  },

  async assignPermissions(id: number, data: AssignPermissionsRequest): Promise<Role> {
    const response = await apiClient.put<Role>(`/roles/${id}/permissions`, data);
    return response.data;
  },

  async delete(id: number): Promise<{ detail: string }> {
    const response = await apiClient.delete<{ detail: string }>(`/roles/${id}`);
    return response.data;
  },
};

export default roleService;
