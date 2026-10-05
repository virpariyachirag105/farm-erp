import { CreatorSummary, FarmSummary, SeasonSummary } from './expense';

export interface SeasonPartnerSummary {
  season: SeasonSummary;
  farm: FarmSummary;
}

export interface PartnerSettlement {
  id: number;
  season_partner_id: number;
  season_partner: SeasonPartnerSummary;
  settlement_date?: string | null;
  total_sales: number;
  total_expenses: number;
  net_profit: number;
  partner_percentage: number;
  partner_amount: number;
  amount_paid: number;
  payment_date?: string | null;
  payment_mode?: string | null;
  reference_no?: string | null;
  remarks?: string | null;
  image?: string | null;
  created_by: number;
  creator: CreatorSummary;
}

export interface PartnerSettlementRequest {
  season_partner_id: number;
  settlement_date?: string | null;
  total_sales: number;
  total_expenses: number;
  partner_percentage: number;
  amount_paid: number;
  payment_date?: string | null;
  payment_mode?: string | null;
  reference_no?: string | null;
  remarks?: string | null;
  image?: string | null;
  created_by: number;
}

