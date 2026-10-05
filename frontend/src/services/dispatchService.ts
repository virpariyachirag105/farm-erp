import apiClient from '../api/client';
import {
  Dispatch,
  DispatchCreateWithItems,
  DispatchItem,
  DispatchListItem,
  DispatchSettlement,
  DispatchSettlementRequest,
  DispatchUpdateWithItems,
  FreeDispatchItem,
  FreeDispatchItemRequest,
} from '../types/dispatch';

export const dispatchService = {
  async getAll(): Promise<DispatchListItem[]> {
    const response = await apiClient.get<DispatchListItem[]>('/dispatches/');
    return response.data;
  },

  async getDispatchItems(): Promise<DispatchItem[]> {
    const response = await apiClient.get<DispatchItem[]>('/dispatch_items/');
    return response.data;
  },

  async getById(id: number): Promise<Dispatch> {
    const response = await apiClient.get<Dispatch>(`/dispatches/${id}`);
    return response.data;
  },

  async createWithItems(data: DispatchCreateWithItems): Promise<Dispatch> {
    const response = await apiClient.post<Dispatch>('/dispatches/with-items', data);
    return response.data;
  },

  async updateWithItems(id: number, data: DispatchUpdateWithItems): Promise<Dispatch> {
    const response = await apiClient.put<Dispatch>(`/dispatches/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/dispatches/${id}`);
  },

  // Free Items sub-module
  async getFreeItems(dispatchId: number): Promise<FreeDispatchItem[]> {
    const response = await apiClient.get<FreeDispatchItem[]>(`/free_dispatch_items/list/${dispatchId}`);
    return response.data;
  },

  async createFreeItem(data: FreeDispatchItemRequest): Promise<FreeDispatchItem> {
    const response = await apiClient.post<FreeDispatchItem>('/free_dispatch_items/', data);
    return response.data;
  },

  async deleteFreeItem(id: number): Promise<FreeDispatchItem> {
    const response = await apiClient.delete<FreeDispatchItem>(`/free_dispatch_items/${id}`);
    return response.data;
  },

  // Dispatch Settlements sub-module
  async getSettlements(dispatchId: number): Promise<DispatchSettlement[]> {
    const response = await apiClient.get<DispatchSettlement[]>(`/dispatch_settlements/list/${dispatchId}`);
    return response.data;
  },

  async createSettlement(data: DispatchSettlementRequest): Promise<DispatchSettlement> {
    const response = await apiClient.post<DispatchSettlement>('/dispatch_settlements/', data);
    return response.data;
  },

  async deleteSettlement(id: number): Promise<DispatchSettlement> {
    const response = await apiClient.delete<DispatchSettlement>(`/dispatch_settlements/${id}`);
    return response.data;
  },
};

export default dispatchService;
