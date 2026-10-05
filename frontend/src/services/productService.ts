import apiClient from '../api/client';
import { Product, ProductRequest } from '../types/product';

export const productService = {
  async getAll(): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/products/');
    return response.data;
  },

  async getById(id: number): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  async create(data: ProductRequest): Promise<Product> {
    const response = await apiClient.post<Product>('/products/', data);
    return response.data;
  },

  async update(id: number, data: ProductRequest): Promise<Product> {
    const response = await apiClient.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<Product> {
    const response = await apiClient.delete<Product>(`/products/${id}`);
    return response.data;
  },
};

export default productService;
