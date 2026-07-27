import type { CashFlowSummaryResponse, CreateFinancialCategoryRequest, CreateFinancialEntryRequest, CreateSupplierRequest, FinancialCategoryResponse, FinancialEntryResponse, ListFinancialEntriesRequest, SupplierResponse, UpdateSupplierRequest } from '@oficina/contracts';
import { apiClient } from '@/lib/api/client';

export const financialApi = {
  categories: async (): Promise<{ categories: FinancialCategoryResponse[] }> => (await apiClient.get('/api/v1/financial/categories')).data,
  createCategory: async (request: CreateFinancialCategoryRequest): Promise<{ category: FinancialCategoryResponse }> => (await apiClient.post('/api/v1/financial/categories', request)).data,
  deleteCategory: async (id: string): Promise<{ success: true }> => (await apiClient.post('/api/v1/financial/categories/delete', { id })).data,
  createEntry: async (request: CreateFinancialEntryRequest): Promise<{ entry: FinancialEntryResponse }> => (await apiClient.post('/api/v1/financial/entries', request)).data,
  settleEntry: async (id: string): Promise<{ entry: FinancialEntryResponse }> => (await apiClient.post('/api/v1/financial/entries/settle', { id })).data,
  deleteEntry: async (id: string): Promise<{ success: true }> => (await apiClient.post('/api/v1/financial/entries/delete', { id })).data,
  cashFlow: async (request: ListFinancialEntriesRequest): Promise<CashFlowSummaryResponse> => (await apiClient.post('/api/v1/financial/cash-flow', request)).data,
  suppliers: async (): Promise<{ suppliers: SupplierResponse[] }> => (await apiClient.get('/api/v1/financial/suppliers')).data,
  createSupplier: async (request: CreateSupplierRequest): Promise<{ supplier: SupplierResponse }> => (await apiClient.post('/api/v1/financial/suppliers', request)).data,
  updateSupplier: async (request: UpdateSupplierRequest): Promise<{ supplier: SupplierResponse }> => (await apiClient.post('/api/v1/financial/suppliers/update', request)).data,
  deleteSupplier: async (id: string): Promise<{ success: true }> => (await apiClient.post('/api/v1/financial/suppliers/delete', { id })).data,
};
