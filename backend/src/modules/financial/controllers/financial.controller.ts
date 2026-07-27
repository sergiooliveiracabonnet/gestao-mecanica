import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Permissions } from '../../../shared/decorators/permissions.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../shared/guards/jwt-auth.guard';
import { CreateFinancialCategoryDto, CreateFinancialEntryDto, CreateSupplierDto, DeleteFinancialCategoryDto, DeleteFinancialEntryDto, DeleteSupplierDto, ListFinancialEntriesDto, SettleFinancialEntryDto, UpdateSupplierDto } from '../dto/financial.dto';
import { FinancialManager } from '../managers/financial.manager';

const ROLES = ['ADMIN', 'MANAGER'] as const;

@Controller('api/v1/financial')
export class FinancialController {
  constructor(private readonly manager: FinancialManager) {}

  @Roles(...ROLES) @Permissions('finance.view') @Get('categories')
  categories(@CurrentUser() user: AuthenticatedUser) { return this.manager.listCategories(user); }

  @Roles(...ROLES) @Permissions('finance.manage') @Post('categories')
  createCategory(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFinancialCategoryDto) { return this.manager.createCategory(user, body); }

  @Roles(...ROLES) @Permissions('finance.manage') @HttpCode(HttpStatus.OK) @Post('categories/delete')
  deleteCategory(@CurrentUser() user: AuthenticatedUser, @Body() body: DeleteFinancialCategoryDto) { return this.manager.deleteCategory(user, body.id); }

  @Roles(...ROLES) @Permissions('finance.manage') @Post('entries')
  createEntry(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateFinancialEntryDto) { return this.manager.createEntry(user, body); }

  @Roles(...ROLES) @Permissions('finance.manage') @HttpCode(HttpStatus.OK) @Post('entries/settle')
  settleEntry(@CurrentUser() user: AuthenticatedUser, @Body() body: SettleFinancialEntryDto) { return this.manager.settleEntry(user, body.id, body.paidAt); }

  @Roles(...ROLES) @Permissions('finance.manage') @HttpCode(HttpStatus.OK) @Post('entries/delete')
  deleteEntry(@CurrentUser() user: AuthenticatedUser, @Body() body: DeleteFinancialEntryDto) { return this.manager.deleteEntry(user, body.id); }

  @Roles(...ROLES) @Permissions('finance.view') @HttpCode(HttpStatus.OK) @Post('cash-flow')
  cashFlow(@Body() body: ListFinancialEntriesDto) { return this.manager.cashFlow(body); }

  @Roles(...ROLES) @Permissions('finance.view') @Get('suppliers')
  suppliers() { return this.manager.listSuppliers(); }

  @Roles(...ROLES) @Permissions('finance.manage') @Post('suppliers')
  createSupplier(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateSupplierDto) { return this.manager.createSupplier(user, body); }

  @Roles(...ROLES) @Permissions('finance.manage') @HttpCode(HttpStatus.OK) @Post('suppliers/update')
  updateSupplier(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateSupplierDto) { return this.manager.updateSupplier(user, body); }

  @Roles(...ROLES) @Permissions('finance.manage') @HttpCode(HttpStatus.OK) @Post('suppliers/delete')
  deleteSupplier(@CurrentUser() user: AuthenticatedUser, @Body() body: DeleteSupplierDto) { return this.manager.deleteSupplier(user, body.id); }
}
