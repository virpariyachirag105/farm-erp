import apiClient from '../api/client';
import { SeasonBoxCost, SeasonBoxCostRequest } from '../types/boxCost';

export const boxCostService = {
  async getAll(seasonId?: number, farmId?: number): Promise<SeasonBoxCost[]> {
    const params: Record<string, number> = {};
    if (seasonId) params.season_id = seasonId;
    if (farmId) params.farm_id = farmId;
    const response = await apiClient.get<SeasonBoxCost[]>('/season_box_costs/', { params });
    return response.data;
  },

  async getById(id: number): Promise<SeasonBoxCost> {
    const response = await apiClient.get<SeasonBoxCost>(`/season_box_costs/${id}`);
    return response.data;
  },

  async create(data: SeasonBoxCostRequest): Promise<SeasonBoxCost> {
    const response = await apiClient.post<SeasonBoxCost>('/season_box_costs/', data);
    return response.data;
  },

  async update(id: number, data: SeasonBoxCostRequest): Promise<SeasonBoxCost> {
    const response = await apiClient.put<SeasonBoxCost>(`/season_box_costs/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/season_box_costs/${id}`);
  },
};

export default boxCostService;
