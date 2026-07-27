import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { MaintenanceAlertListItemResponse, MaintenanceAlertResponse, PaginationData } from '@oficina/contracts';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { MaintenanceAlertManager } from '../managers/maintenance-alert.manager';
import { MaintenanceAlertListDto, ResolveMaintenanceAlertDto } from '../dto/maintenance-alert.dto';

// Todos os 4 papéis têm acesso total — mesmo padrão de Ordem de Serviço
// (spec: recepção, gerente e mecânico todos precisam ver quem está devendo
// revisão e podem marcar como resolvido).
const ALL_ROLES = ['ADMIN', 'MANAGER', 'FRONT_DESK', 'MECHANIC'] as const;

@Controller('api/v1')
export class MaintenanceAlertsController {
  constructor(private readonly maintenanceAlertManager: MaintenanceAlertManager) {}

  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @Post('maintenance-alerts/list')
  async list(@Body() body: MaintenanceAlertListDto): Promise<PaginationData<MaintenanceAlertListItemResponse>> {
    return this.maintenanceAlertManager.list(body);
  }

  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @Post('maintenance-alerts/resolve')
  async resolve(
    @CurrentUser() actingUser: AuthenticatedUser,
    @Body() body: ResolveMaintenanceAlertDto,
  ): Promise<{ alert: MaintenanceAlertResponse }> {
    return this.maintenanceAlertManager.resolve(actingUser, body.id);
  }
}
