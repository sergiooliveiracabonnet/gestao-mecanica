export const FIPE_CATEGORIES = ['CAR', 'MOTORCYCLE', 'TRUCK'] as const;
export type FipeCategory = (typeof FIPE_CATEGORIES)[number];

export interface FipeBrandResponse {
  id: string;
  name: string;
}

export interface FipeModelResponse {
  id: string;
  name: string;
}
