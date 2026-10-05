export type SourceType = 'FARM' | 'MARKET';
export type BoxSize = '5' | '10' | '20' | 'DOZEN';
export type DispatchStatus = 'PENDING' | 'DISPATCHED' | 'COMPLETED';

export interface FarmSummary {
  id: number;
  name: string;
}

export interface ProductSummary {
  id: number;
  name: string;
}

export interface SeasonSummary {
  id: number;
  name: string;
}

export interface DealerSummary {
  id: number;
  name: string;
}

export interface DispatchItem {
  id: number;
  dispatch_id: number;
  farm_id?: number | null;
  farm?: FarmSummary | null;
  product_id?: number | null;
  product?: ProductSummary | null;
  source_type: SourceType;
  variety?: string | null;
  grade?: string | null;
  box_size_kg: BoxSize;
  box_quantity: number;
  total_weight_kg: number;
  price_per_box: number;
  total_amount: number;
  remarks?: string | null;
}

export interface DispatchItemRequest {
  farm_id?: number | null;
  product_id?: number | null;
  source_type: SourceType;
  variety?: string | null;
  grade?: string | null;
  box_size_kg: BoxSize;
  box_quantity: number;
  price_per_box: number;
  remarks?: string | null;
}

export interface DispatchItemUpdate extends DispatchItemRequest {
  id?: number | null;
}

export interface DispatchListItem {
  id: number;
  dispatch_no: string;
  dispatch_date?: string | null;
  season_id?: number | null;
  season?: SeasonSummary | null;
  dealer_id?: number | null;
  dealer?: DealerSummary | null;
  transport_charge: number;
  total_boxes: number;
  total_amount: number;
}

export interface Dispatch {
  id: number;
  dispatch_no: string;
  dispatch_date?: string | null;
  season_id?: number | null;
  season?: SeasonSummary | null;
  dealer_id?: number | null;
  dealer?: DealerSummary | null;
  vehicle_no?: string | null;
  driver_name?: string | null;
  transport_name?: string | null;
  transport_charge: number;
  total_boxes: number;
  total_weight_kg: number;
  total_amount: number;
  remarks?: string | null;
  status?: DispatchStatus | string | null;
  created_by: number;
  items: DispatchItem[];
}

export interface DispatchCreateWithItems {
  dispatch_date?: string | null;
  season_id?: number | null;
  dealer_id?: number | null;
  vehicle_no?: string | null;
  driver_name?: string | null;
  transport_name?: string | null;
  transport_charge: number;
  remarks?: string | null;
  status?: string | null;
  created_by: number;
  items: DispatchItemRequest[];
}

export interface DispatchUpdateWithItems {
  dispatch_date?: string | null;
  season_id?: number | null;
  dealer_id?: number | null;
  vehicle_no?: string | null;
  driver_name?: string | null;
  transport_name?: string | null;
  transport_charge: number;
  remarks?: string | null;
  status?: string | null;
  created_by: number;
  items: DispatchItemUpdate[];
}

export interface FreeDispatchItem {
  id: number;
  dispatch_id: number;
  dispatch_item_id?: number | null;
  distribution_date?: string | null;
  box_quantity: number;
  remarks?: string | null;
  dispatch_item?: {
    id: number;
    price_per_box: number;
  } | null;
}

export interface FreeDispatchItemRequest {
  dispatch_id: number;
  dispatch_item_id?: number | null;
  distribution_date?: string | null;
  box_quantity: number;
  remarks?: string | null;
}

export interface DispatchSettlement {
  id: number;
  dispatch_id: number;
  settlement_date?: string | null;
  loss_amount: number;
  loss_remarks?: string | null;
  remarks?: string | null;
}

export interface DispatchSettlementRequest {
  dispatch_id: number;
  settlement_date?: string | null;
  loss_amount: number;
  loss_remarks?: string | null;
  remarks?: string | null;
}
