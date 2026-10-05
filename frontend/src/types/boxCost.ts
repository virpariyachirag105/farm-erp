import { BoxSize } from './dispatch';
import { CreatorSummary, FarmSummary, SeasonSummary } from './expense';

export interface SeasonBoxCost {
  id: number;
  season_id: number;
  season: SeasonSummary;
  farm_id: number;
  farm: FarmSummary;
  box_size_kg: BoxSize;
  total_boxes: number;
  price_per_box: number;
  total_amount: number;
  remarks?: string | null;
  created_by: number;
  creator: CreatorSummary;
}

export interface SeasonBoxCostRequest {
  season_id: number;
  farm_id: number;
  box_size_kg: BoxSize;
  total_boxes: number;
  price_per_box: number;
  remarks?: string | null;
  created_by: number;
}
