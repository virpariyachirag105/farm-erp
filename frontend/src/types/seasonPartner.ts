export interface SeasonPartner {
  id: number;
  season_id: number;
  farm_id: number;
  user_id?: number | null;
  partner_name?: string | null;
  partnership_percentage?: number | null;
  agreement_date?: string | null;
  remarks: string;
}

export interface SeasonPartnerRequest {
  season_id: number;
  farm_id: number;
  user_id?: number | null;
  partner_name?: string | null;
  partnership_percentage?: number | null;
  agreement_date?: string | null;
  remarks: string;
}
