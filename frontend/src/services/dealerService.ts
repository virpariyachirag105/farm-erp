import apiClient from '../api/client';
import { Dealer, DealerRequest } from '../types/dealer';

export const dealerService = {
  async getAll(): Promise<Dealer[]> {
    const response = await apiClient.get<Dealer[]>('/dealers/');
    return response.data;
  },

  async getById(id: number): Promise<Dealer> {
    const response = await apiClient.get<Dealer>(`/dealers/${id}`);
    return response.data;
  },

  async create(data: DealerRequest): Promise<Dealer> {
    const response = await apiClient.post<Dealer>('/dealers/', data);
    return response.data;
  },

  async update(id: number, data: DealerRequest): Promise<Dealer> {
    const response = await apiClient.put<Dealer>(`/dealers/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<Dealer> {
    const response = await apiClient.delete<Dealer>(`/dealers/${id}`);
    return response.data;
  },
};

export default dealerService;
