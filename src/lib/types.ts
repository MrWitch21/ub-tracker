export interface Race {
  id: string;
  code: string;
  name: string;
  admin_pin: string | null;
  team_target: number;
  planned_start_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  created_at: string;
}

export interface Runner {
  id: string;
  race_id: string;
  name: string;
  img_url: string | null;
  target_dist: number;
  is_active: boolean;
  is_finished: boolean;
  started_at: string | null;
  finished_at: string | null;
  sort_order: number;
  logged_dist: number;
  last_lat: number | null;
  last_lon: number | null;
  last_update: string | null;
  gps_token: string | null;
}

export interface PositionPoint {
  lat: number;
  lon: number;
}
