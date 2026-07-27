export interface DashboardMonthlyRevenueResponse {
  month: string;
  revenueCents: number;
}

export interface DashboardTechnicianWorkloadResponse {
  technicianId?: string;
  technicianName: string;
  activeOrders: number;
}

export interface DashboardFinancialPipelineItemResponse {
  id: string;
  orderNumber: number;
  status: 'OPEN' | 'AWAITING_APPROVAL' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'DELIVERED';
  customerName: string;
  vehicleLabel: string;
  vehiclePlate: string;
  amountCents: number;
  expectedDeliveryAt?: string;
}

export interface DashboardTopServiceResponse {
  description: string;
  count: number;
  revenueCents: number;
}

export interface DashboardBusinessSummaryResponse {
  monthRevenueCents: number;
  previousMonthRevenueCents: number;
  activePipelineCents: number;
  accountsReceivableCents: number;
  averageTicketCents: number;
  overdueDeliveries: number;
  deliveredThisMonth: number;
  receiptsThisMonth: number;
  partsRevenueCents: number;
  laborRevenueCents: number;
  openOrders: number;
  completedAwaitingDeliveryCents: number;
  inProgressCents: number;
  monthlyRevenue: DashboardMonthlyRevenueResponse[];
  technicianWorkload: DashboardTechnicianWorkloadResponse[];
  financialPipeline: DashboardFinancialPipelineItemResponse[];
  topServices: DashboardTopServiceResponse[];
}
