import apiClient from '../api/client';
import { Expense, ExpenseRequest } from '../types/expense';

export const expenseService = {
  async getAll(seasonId?: number, farmId?: number): Promise<Expense[]> {
    const params: Record<string, number> = {};
    if (seasonId) params.season_id = seasonId;
    if (farmId) params.farm_id = farmId;
    const response = await apiClient.get<Expense[]>('/expenses/', { params });
    return response.data;
  },

  async getById(id: number): Promise<Expense> {
    const response = await apiClient.get<Expense>(`/expenses/${id}`);
    return response.data;
  },

  async create(data: ExpenseRequest): Promise<Expense> {
    const response = await apiClient.post<Expense>('/expenses/', data);
    return response.data;
  },

  async update(id: number, data: ExpenseRequest): Promise<Expense> {
    const response = await apiClient.put<Expense>(`/expenses/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/expenses/${id}`);
  },
};

export default expenseService;
