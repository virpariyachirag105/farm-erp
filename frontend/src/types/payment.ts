export interface CreatorSummary {
  id: number;
  name: string;
}

export interface DealerSummary {
  id: number;
  name: string;
}

export interface SeasonSummary {
  id: number;
  name: string;
}

export interface DealerPayment {
  id: number;
  dealer_id: number;
  dealer: DealerSummary;
  season_id?: number | null;
  season?: SeasonSummary | null;
  payment_date?: string | null;
  amount: number;
  payment_mode?: string | null;
  reference_no?: string | null;
  received_by?: string | null;
  remarks?: string | null;
  created_by: number;
  creator: CreatorSummary;
}

export interface DealerPaymentRequest {
  dealer_id: number;
  season_id?: number | null;
  payment_date?: string | null;
  amount: number;
  payment_mode?: string | null;
  reference_no?: string | null;
  received_by?: string | null;
  remarks?: string | null;
  created_by: number;
}
