export interface PageableRequest {
  offset: number;
  limit: number;
}

export interface PaginationData<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
