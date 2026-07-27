import type { PageableRequest } from '../response/pagination.response';
import type { MaintenanceAlertStatus } from '../response/maintenance-alert.response';

export interface MaintenanceAlertListRequest extends PageableRequest {
  status?: MaintenanceAlertStatus;
}

export interface ResolveMaintenanceAlertRequest {
  id: string;
}
