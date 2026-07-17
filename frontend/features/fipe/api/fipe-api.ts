import { apiClient } from '@/lib/api/client';
import type { FipeBrandResponse, FipeCategory, FipeModelResponse } from '@oficina/contracts';

// `params` do axios NÃO passa pelo interceptor de conversão pra
// snake_case (esse só converte `data`, o body) — `brand_id` precisa vir
// literal aqui, já que o backend lê a query crua via @Expose({name}).
export const fipeApi = {
  async listBrands(category: FipeCategory): Promise<{ brands: FipeBrandResponse[] }> {
    const response = await apiClient.get<{ brands: FipeBrandResponse[] }>('/api/v1/fipe/brands', { params: { category } });
    return response.data;
  },

  async listModels(brandId: string): Promise<{ models: FipeModelResponse[] }> {
    const response = await apiClient.get<{ models: FipeModelResponse[] }>('/api/v1/fipe/models', { params: { brand_id: brandId } });
    return response.data;
  },
};
