import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import type { CustomerListItemResponse, CustomerResponse, PaginationData } from '@oficina/contracts';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Permissions } from '../../../shared/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { CustomerManager } from '../managers/customer.manager';
import { CreateCustomerDto, CustomerListDto, DeleteCustomerDto, GetCustomerDto, UpdateCustomerDto } from '../dto/customer.dto';

// Um único controller sob /api/v1 (não /api/v1/customers) porque a rota de
// leitura individual é singular (`/customer`) e as demais são plurais
// (`/customers`, `/customers/list`, ...) — mesmo padrão de agrupamento por
// prefixo comum descrito em API_DESIGN.md.
@Controller('api/v1')
export class CustomersController {
  constructor(private readonly customerManager: CustomerManager) {}

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK')
  @Permissions('customers.manage')
  @Post('customers')
  async create(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: CreateCustomerDto): Promise<{ customer: CustomerResponse }> {
    return this.customerManager.create(actingUser, body);
  }

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK')
  @Permissions('customers.manage')
  @HttpCode(HttpStatus.OK)
  @Post('customers/update')
  async update(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: UpdateCustomerDto): Promise<{ customer: CustomerResponse }> {
    return this.customerManager.update(actingUser, body);
  }

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK')
  @Permissions('customers.manage')
  @HttpCode(HttpStatus.OK)
  @Post('customers/delete')
  async delete(@CurrentUser() actingUser: AuthenticatedUser, @Body() body: DeleteCustomerDto): Promise<{ customer: CustomerResponse }> {
    return this.customerManager.delete(actingUser, body.id);
  }

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK', 'MECHANIC')
  @Permissions('customers.view')
  @Get('customer')
  async get(@Query() query: GetCustomerDto): Promise<{ customer: CustomerResponse }> {
    return this.customerManager.getById(query.id);
  }

  @Roles('ADMIN', 'MANAGER', 'FRONT_DESK', 'MECHANIC')
  @Permissions('customers.view')
  @HttpCode(HttpStatus.OK)
  @Post('customers/list')
  async list(@Body() body: CustomerListDto): Promise<PaginationData<CustomerListItemResponse>> {
    return this.customerManager.list(body);
  }
}
