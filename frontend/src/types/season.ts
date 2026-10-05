export type SeasonStatus = 'UPCOMING' | 'ACTIVE' | 'CLOSED';

export interface Season {
  id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  status: SeasonStatus;
}

export interface SeasonRequest {
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  status: SeasonStatus;
}
