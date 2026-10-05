import apiClient from '../api/client';
import { User, UserRequest } from '../types/auth';

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await apiClient.get<User[]>('/users/');
    return response.data;
  },

  async getById(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(data: UserRequest): Promise<User> {
    const response = await apiClient.post<User>('/users/', data);
    return response.data;
  },

  async update(id: number, data: UserRequest): Promise<User> {
    const response = await apiClient.put<User>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<User> {
    const response = await apiClient.delete<User>(`/users/${id}`);
    return response.data;
  },

  async uploadImage(id: number, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<User>(`/users/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default userService;
