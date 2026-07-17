'use client';

import { useQuery } from '@tanstack/react-query';
import type { FipeCategory } from '@oficina/contracts';
import { fipeApi } from '../api/fipe-api';

const FIPE_BRANDS_KEY = 'fipe-brands';
const FIPE_MODELS_KEY = 'fipe-models';

export function useFipeBrands(category: FipeCategory) {
  return useQuery({
    queryKey: [FIPE_BRANDS_KEY, category],
    queryFn: () => fipeApi.listBrands(category),
  });
}

// `enabled` (default true) — não busca modelos antes de uma marca ser
// escolhida, mesmo padrão de useServiceOrdersList na aba Histórico (Feature 6).
export function useFipeModels(brandId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [FIPE_MODELS_KEY, brandId],
    queryFn: () => fipeApi.listModels(brandId as string),
    enabled: Boolean(brandId) && (options?.enabled ?? true),
  });
}
