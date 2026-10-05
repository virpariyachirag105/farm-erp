export type DealerType = 'PERCENTAGE' | 'FIXED' | 'NONE';

export interface Dealer {
  id: number;
  name: string;
  city?: string | null;
  mobile?: string | null;
  address?: string | null;
  commission_type: DealerType;
  commission_value: number;
  is_active: boolean;
}

export interface DealerRequest {
  name: string;
  city?: string | null;
  mobile?: string | null;
  address?: string | null;
  commission_type: DealerType;
  commission_value: number;
  is_active?: boolean;
}
