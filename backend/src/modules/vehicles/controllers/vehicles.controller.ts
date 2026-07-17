import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import type { PaginationData, VehicleListItemResponse, VehicleResponse } from '@oficina/contracts';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { VehicleManager } from '../managers/vehicle.manager';
import { CreateVehicleDto, DeleteVehicleDto, GetVehicleDto, UpdateVehicleDto, VehicleListDto } from '../dto/vehicle.dto';

// Mesmo padrão de agrupamento de CustomersController: um único controller
// sob /api/v1 porque a rota de leitura individual é singular (/vehicle) e
// as demais são plurais (/vehicles, /vehicles/list, ...).
@Controller('api/v1')
export class VehiclesController {
  constructor(private readonly vehicleManager: VehicleManager) {}

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK')
  @Post('vehicles')
  async create(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: CreateVehicleDto): Promise<{ vehicle: VehicleResponse }> {
    return this.vehicleManager.create(actingUser, body);
  }

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK')
  @HttpCode(HttpStatus.OK)
  @Post('vehicles/update')
  async update(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: UpdateVehicleDto): Promise<{ vehicle: VehicleResponse }> {
    return this.vehicleManager.update(actingUser, body);
  }

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK')
  @HttpCode(HttpStatus.OK)
  @Post('vehicles/delete')
  async delete(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: DeleteVehicleDto): Promise<{ vehicle: VehicleResponse }> {
    return this.vehicleManager.delete(actingUser, body.id);
  }

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK', 'MECHANIC')
  @Get('vehicle')
  async get(@Query() query: GetVehicleDto): Promise<{ vehicle: VehicleResponse }> {
    return this.vehicleManager.getById(query.id);
  }

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK', 'MECHANIC')
  @HttpCode(HttpStatus.OK)
  @Post('vehicles/list')
  async list(@Body() body: VehicleListDto): Promise<PaginationData<VehicleListItemResponse>> {
    return this.vehicleManager.list(body);
  }
}
