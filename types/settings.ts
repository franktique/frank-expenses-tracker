export interface AppSettings {
  id: string;
  default_fund_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSettingsRequest {
  default_fund_id: string | null;
}

export interface UpdateSettingsRequest {
  default_fund_id: string | null;
}

export interface SettingsResponse {
  success: boolean;
  settings: AppSettings;
  error?: string;
}
