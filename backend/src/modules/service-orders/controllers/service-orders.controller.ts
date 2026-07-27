import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import type { PaginationData, ServiceOrderItemResponse, ServiceOrderListItemResponse, ServiceOrderResponse } from '@oficina/contracts';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { ServiceOrderManager } from '../managers/service-order.manager';
import {
  CreateServiceOrderDto,
  DeleteServiceOrderDto,
  GetServiceOrderDto,
  ServiceOrderListDto,
  TransitionServiceOrderDto,
  UpdateServiceOrderDto,
} from '../dto/service-order.dto';
import { CreateServiceOrderItemDto, DeleteServiceOrderItemDto, UpdateServiceOrderItemDto } from '../dto/service-order-item.dto';

// Todos os 4 papéis têm acesso total a todo endpoint — divergência
// deliberada do padrão de Clientes/Veículos (spec: "todos os papéis fazem
// tudo", reflete que recepção e mecânico mexem na mesma OS em etapas
// diferentes do fluxo real).
const ALL_ROLES = ['ADMIN', 'MANAGER', 'FRONT_DESK', 'MECHANIC'] as const;

// Itens/preço da OS: acesso restrito, sem MECHANIC — decisão explícita da
// spec (Feature 8), diferente do ALL_ROLES usado no resto deste controller.
const ITEM_ROLES = ['ADMIN', 'MANAGER', 'FRONT_DESK'] as const;

@Controller('api/v1')
export class ServiceOrdersController {
  constructor(private readonly serviceOrderManager: ServiceOrderManager) {}

  @Roles(...ALL_ROLES)
  @Post('service-orders')
  async create(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: CreateServiceOrderDto): Promise<{ serviceOrder: ServiceOrderResponse }> {
    return this.serviceOrderManager.create(actingUser, body);
  }

  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @Post('service-orders/update')
  async update(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: UpdateServiceOrderDto): Promise<{ serviceOrder: ServiceOrderResponse }> {
    return this.serviceOrderManager.update(actingUser, body);
  }

  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @Post('service-orders/transition')
  async transition(
    @CurrentUser() actingUser: AuthenticatedUser,
    @Body() body: TransitionServiceOrderDto,
  ): Promise<{ serviceOrder: ServiceOrderResponse }> {
    return this.serviceOrderManager.transition(actingUser, body);
  }

  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @Post('service-orders/delete')
  async delete(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: DeleteServiceOrderDto): Promise<{ serviceOrder: ServiceOrderResponse }> {
    return this.serviceOrderManager.delete(actingUser, body.id);
  }

  @Roles(...ALL_ROLES)
  @Get('service-order')
  async get(@Query() query: GetServiceOrderDto): Promise<{ serviceOrder: ServiceOrderResponse }> {
    return this.serviceOrderManager.getById(query.id);
  }

  @Roles(...ALL_ROLES)
  @HttpCode(HttpStatus.OK)
  @Post('service-orders/list')
  async list(@Body() body: ServiceOrderListDto): Promise<PaginationData<ServiceOrderListItemResponse>> {
    return this.serviceOrderManager.list(body);
  }

  @Roles(...ITEM_ROLES)
  @Post('service-orders/items')
  async addItem(@Body() body: CreateServiceOrderItemDto): Promise<{ item: ServiceOrderItemResponse }> {
    return this.serviceOrderManager.addItem(body);
  }

  @Roles(...ITEM_ROLES)
  @HttpCode(HttpStatus.OK)
  @Post('service-orders/items/update')
  async updateItem(@Body() body: UpdateServiceOrderItemDto): Promise<{ item: ServiceOrderItemResponse }> {
    return this.serviceOrderManager.updateItem(body);
  }

  @Roles(...ITEM_ROLES)
  @HttpCode(HttpStatus.OK)
  @Post('service-orders/items/delete')
  async deleteItem(@Body() body: DeleteServiceOrderItemDto): Promise<{ item: ServiceOrderItemResponse }> {
    return this.serviceOrderManager.deleteItem(body.id);
  }
}
