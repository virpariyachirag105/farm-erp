import apiClient from '../api/client';
import { SeasonPartner, SeasonPartnerRequest } from '../types/seasonPartner';

export const seasonPartnerService = {
  async getAll(): Promise<SeasonPartner[]> {
    const response = await apiClient.get<SeasonPartner[]>('/season_partners/');
    return response.data;
  },

  async getById(id: number): Promise<SeasonPartner> {
    const response = await apiClient.get<SeasonPartner>(`/season_partners/${id}`);
    return response.data;
  },

  async create(data: SeasonPartnerRequest): Promise<SeasonPartner> {
    const response = await apiClient.post<SeasonPartner>('/season_partners/', data);
    return response.data;
  },

  async update(id: number, data: SeasonPartnerRequest): Promise<SeasonPartner> {
    const response = await apiClient.put<SeasonPartner>(`/season_partners/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<SeasonPartner> {
    const response = await apiClient.delete<SeasonPartner>(`/season_partners/${id}`);
    return response.data;
  },
};

export default seasonPartnerService;
