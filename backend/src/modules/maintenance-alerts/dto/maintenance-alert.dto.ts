import { IsIn, IsInt, IsNotEmpty, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { MAINTENANCE_ALERT_STATUSES } from '@oficina/contracts';
import type { MaintenanceAlertListRequest, ResolveMaintenanceAlertRequest } from '@oficina/contracts';

const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_LIMIT = 20;

export class MaintenanceAlertListDto implements MaintenanceAlertListRequest {
  @IsOptional()
  @IsIn(MAINTENANCE_ALERT_STATUSES, { message: 'status must be a valid status' })
  status?: MaintenanceAlertListRequest['status'];

  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit: number = DEFAULT_LIST_LIMIT;
}

export class ResolveMaintenanceAlertDto implements ResolveMaintenanceAlertRequest {
  @IsNotEmpty({ message: 'id is required' })
  @IsUUID('4', { message: 'id must be a valid id' })
  id!: string;
}
