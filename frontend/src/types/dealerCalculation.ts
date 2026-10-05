// ─── Dealer Calculation Types ────────────────────────────────────────────────

export interface DealerCalcItemRow {
  id: number;
  farm_id?: number | null;
  farm_name: string;
  farm_type: string;
  source_type: string;
  variety: string;
  grade: string;
  box_size_kg: string;
  box_quantity: number;
  price_per_box: number;
  total_weight_kg: number;
  gross_amount: number;
  free_boxes: number;
  free_amount: number;
}

export interface DealerCalcSettlementRow {
  id: number;
  settlement_date?: string | null;
  loss_amount: number;
  loss_remarks?: string | null;
}

export interface FreeItemDetail {
  id: number;
  distribution_date?: string | null;
  box_quantity: number;
  remarks: string;
  dispatch_item_id?: number | null;
  variety: string;
  grade: string;
  box_size_kg: string;
  price_per_box: number;
  free_amount: number;
  farm_name: string;
}

export interface FarmBreakdown {
  farm_id?: number | null;
  farm_name: string;
  farm_type: string;
  gross_amount: number;
  free_deduction: number;
  taxable_amount: number;
  commission: number;
  transport: number;
  damage: number;
  net_amount: number;
}

export interface DispatchCalcSummary {
  gross_amount: number;
  free_deduction: number;
  commission: number;
  transport: number;
  damage: number;
  net_amount: number;
  dealer_total_amount: number;
}

export interface DispatchCalculation {
  dispatch_id: number;
  dispatch_no: string;
  dispatch_date?: string | null;
  dealer_id: number;
  dealer_name: string;
  dealer_city: string;
  vehicle_no?: string | null;
  transport_name?: string | null;
  transport_charge: number;
  status?: string | null;
  items: DealerCalcItemRow[];
  free_items: FreeItemDetail[];
  settlements: DealerCalcSettlementRow[];
  farm_breakdowns: FarmBreakdown[];
  summary: DispatchCalcSummary;
}

export interface DispatchListCalcRow {
  dispatch_id: number;
  dispatch_no: string;
  dispatch_date?: string | null;
  dealer_id?: number | null;
  dealer_name?: string | null;
  status?: string | null;
  farms?: string;
  farm_names?: string[];
  boxes_20kg?: number;
  boxes_10kg?: number;
  boxes_5kg?: number;
  boxes_dozen?: number;
  total_boxes?: number;
  box_summary?: string;
  gross_amount: number;
  free_deduction: number;
  commission: number;
  transport: number;
  damage: number;
  net_amount: number;
  dealer_total_amount: number;
}

export interface DealerPaymentRow {
  id: number;
  season_id?: number | null;
  payment_date?: string | null;
  amount: number;
  payment_mode: string;
  reference_no?: string | null;
  remarks?: string | null;
}

export interface DealerCalcTotals {
  gross_amount: number;
  free_deduction: number;
  commission: number;
  transport: number;
  damage: number;
  net_amount: number;
  previous_balance: number;
  total_paid: number;
  pending_amount: number;
  grand_pending_amount: number;
}

export interface DealerSummary {
  dealer_id: number;
  dealer_name: string;
  dealer_city: string;
  dealer_mobile: string;
  commission_type: string;
  commission_value: number;
  dispatch_count: number;
  dispatches: DispatchListCalcRow[];
  free_items?: FreeItemDetail[];
  totals: DealerCalcTotals;
  payments: DealerPaymentRow[];
}
