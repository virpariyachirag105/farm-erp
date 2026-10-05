export type FarmType = 'OWN' | 'MARKET';

export interface Farm {
  id: number;
  name: string;
  location?: string | null;
  owner_name: string;
  farm_type: FarmType;
  is_active: boolean;
}

export interface FarmRequest {
  name: string;
  location?: string | null;
  owner_name: string;
  farm_type: FarmType;
  is_active?: boolean;
}
