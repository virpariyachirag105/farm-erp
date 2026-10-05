import apiClient from '../api/client';
import { DealerPayment, DealerPaymentRequest } from '../types/payment';

export const paymentService = {
  async getAll(dealerId?: number, seasonId?: number): Promise<DealerPayment[]> {
    const params: Record<string, number> = {};
    if (dealerId !== undefined && dealerId !== null) params.dealer_id = dealerId;
    if (seasonId !== undefined && seasonId !== null) params.season_id = seasonId;
    const response = await apiClient.get<DealerPayment[]>('/dealer_payments/', { params });
    return response.data;
  },

  async getById(id: number): Promise<DealerPayment> {
    const response = await apiClient.get<DealerPayment>(`/dealer_payments/${id}`);
    return response.data;
  },

  async create(data: DealerPaymentRequest): Promise<DealerPayment> {
    const response = await apiClient.post<DealerPayment>('/dealer_payments/', data);
    return response.data;
  },

  async update(id: number, data: DealerPaymentRequest): Promise<DealerPayment> {
    const response = await apiClient.put<DealerPayment>(`/dealer_payments/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/dealer_payments/${id}`);
  },
};

export default paymentService;
