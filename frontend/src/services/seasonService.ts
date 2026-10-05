import apiClient from '../api/client';
import { Season, SeasonRequest } from '../types/season';

export const seasonService = {
  async getAll(): Promise<Season[]> {
    const response = await apiClient.get<Season[]>('/seasons/');
    return response.data;
  },

  async getById(id: number): Promise<Season> {
    const response = await apiClient.get<Season>(`/seasons/${id}`);
    return response.data;
  },

  async create(data: SeasonRequest): Promise<Season> {
    const response = await apiClient.post<Season>('/seasons/', data);
    return response.data;
  },

  async update(id: number, data: SeasonRequest): Promise<Season> {
    const response = await apiClient.put<Season>(`/seasons/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<Season> {
    const response = await apiClient.delete<Season>(`/seasons/${id}`);
    return response.data;
  },
};

export default seasonService;
