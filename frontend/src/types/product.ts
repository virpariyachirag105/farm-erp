export interface Product {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface ProductRequest {
  name: string;
  description?: string | null;
  is_active?: boolean;
}
