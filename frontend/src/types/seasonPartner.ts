export interface SeasonPartner {
  id: number;
  season_id: number;
  farm_id: number;
  user_id?: number | null;
  partner_name?: string | null;
  partnership_percentage?: number | null;
  agreement_date?: string | null;
  remarks: string;
  season?: { id: number; name: string } | null;
  farm?: { id: number; name: string; farm_type?: string } | null;
  user?: { id: number; name: string; email?: string; role?: string } | null;
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
