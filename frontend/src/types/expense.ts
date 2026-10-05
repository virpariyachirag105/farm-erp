export interface SeasonSummary {
  id: number;
  name: string;
}

export interface FarmSummary {
  id: number;
  name: string;
}

export interface CreatorSummary {
  id: number;
  name: string;
}

export interface Expense {
  id: number;
  season_id: number;
  season: SeasonSummary;
  farm_id: number;
  farm: FarmSummary;
  expense_date?: string | null;
  expense_type?: string | null;
  description?: string | null;
  amount: number;
  paid_to?: string | null;
  payment_mode?: string | null;
  remarks?: string | null;
  created_by: number;
  creator: CreatorSummary;
}

export interface ExpenseRequest {
  season_id: number;
  farm_id: number;
  expense_date?: string | null;
  expense_type?: string | null;
  description?: string | null;
  amount: number;
  paid_to?: string | null;
  payment_mode?: string | null;
  remarks?: string | null;
  created_by: number;
}
