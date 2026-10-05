import apiClient from '../api/client';
import { DealerSummary, DispatchListCalcRow, DispatchCalculation } from '../types/dealerCalculation';

export const dealerCalculationService = {
  /**
   * Season-level dealer summary.
   * Returns all dealers with aggregated totals for the selected season.
   */
  async getSeasonSummary(seasonId: number, farmId?: number): Promise<DealerSummary[]> {
    const params: Record<string, number> = {};
    if (farmId) params.farm_id = farmId;
    const response = await apiClient.get<DealerSummary[]>(
      `/dealer_calculations/season/${seasonId}/summary`,
      { params }
    );
    return response.data;
  },

  /**
   * Dealer-level dispatch list with per-dispatch calculations.
   */
  async getDealerDispatches(
    seasonId: number,
    dealerId: number,
    farmId?: number
  ): Promise<DispatchCalculation[]> {
    const params: Record<string, number> = {};
    if (farmId) params.farm_id = farmId;
    const response = await apiClient.get<DispatchCalculation[]>(
      `/dealer_calculations/season/${seasonId}/dealer/${dealerId}/dispatches`,
      { params }
    );
    return response.data;
  },

  /**
   * Farm-level dispatch list with per-dispatch calculations for a season and farm.
   */
  async getSeasonFarmDispatches(
    seasonId: number,
    farmId: number
  ): Promise<DispatchListCalcRow[]> {
    const response = await apiClient.get<DispatchListCalcRow[]>(
      `/dealer_calculations/season/${seasonId}/farm/${farmId}/dispatches`
    );
    return response.data;
  },

  /**
   * Full item-level calculation for a single dispatch.
   */
  async getDispatchCalculation(dispatchId: number, farmId?: number): Promise<DispatchCalculation> {
    const params: Record<string, number> = {};
    if (farmId) params.farm_id = farmId;
    const response = await apiClient.get<DispatchCalculation>(
      `/dealer_calculations/dispatch/${dispatchId}`,
      { params }
    );
    return response.data;
  },
};

export default dealerCalculationService;
