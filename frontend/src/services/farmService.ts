import apiClient from '../api/client';
import { Farm, FarmRequest } from '../types/farm';

export const farmService = {
  async getAll(): Promise<Farm[]> {
    const response = await apiClient.get<Farm[]>('/farms/');
    return response.data;
  },

  async getById(id: number): Promise<Farm> {
    const response = await apiClient.get<Farm>(`/farms/${id}`);
    return response.data;
  },

  async create(data: FarmRequest): Promise<Farm> {
    const response = await apiClient.post<Farm>('/farms/', data);
    return response.data;
  },

  async update(id: number, data: FarmRequest): Promise<Farm> {
    const response = await apiClient.put<Farm>(`/farms/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<Farm> {
    const response = await apiClient.delete<Farm>(`/farms/${id}`);
    return response.data;
  },
};

export default farmService;
