import apiClient from '../api/client';
import { PartnerSettlement, PartnerSettlementRequest } from '../types/settlement';

export const settlementService = {
  async getAll(seasonId?: number, farmId?: number): Promise<PartnerSettlement[]> {
    const params: Record<string, number> = {};
    if (seasonId) params.season_id = seasonId;
    if (farmId) params.farm_id = farmId;
    const response = await apiClient.get<PartnerSettlement[]>('/partner_settlements/', { params });
    return response.data;
  },

  async getById(id: number): Promise<PartnerSettlement> {
    const response = await apiClient.get<PartnerSettlement>(`/partner_settlements/${id}`);
    return response.data;
  },

  async create(data: PartnerSettlementRequest): Promise<PartnerSettlement> {
    const response = await apiClient.post<PartnerSettlement>('/partner_settlements/', data);
    return response.data;
  },

  async update(id: number, data: PartnerSettlementRequest): Promise<PartnerSettlement> {
    const response = await apiClient.put<PartnerSettlement>(`/partner_settlements/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/partner_settlements/${id}`);
  },

  async uploadImage(file: File): Promise<{ image_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ image_url: string }>('/partner_settlements/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default settlementService;
