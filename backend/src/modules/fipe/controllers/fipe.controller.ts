import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import type { FipeBrandResponse, FipeModelResponse } from '@oficina/contracts';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { Permissions } from '../../../shared/decorators/permissions.decorator';
import { FipeManager } from '../managers/fipe.manager';
import { FipeBrandListDto, FipeModelListDto } from '../dto/fipe.dto';

const ALL_ROLES = ['ADMIN', 'MANAGER', 'FRONT_DESK', 'MECHANIC'] as const;

@Controller('api/v1/fipe')
export class FipeController {
  constructor(private readonly fipeManager: FipeManager) {}

  @Roles(...ALL_ROLES)
  @Permissions('vehicles.view')
  @Get('brands')
  async brands(@Query() query: FipeBrandListDto): Promise<{ brands: FipeBrandResponse[] }> {
    return this.fipeManager.listBrands(query.category);
  }

  @Roles(...ALL_ROLES)
  @Permissions('vehicles.view')
  @Get('models')
  async models(@Query() query: FipeModelListDto): Promise<{ models: FipeModelResponse[] }> {
    return this.fipeManager.listModels(query.brandId);
  }

  // 202: enfileira e responde na hora, não espera o job de sincronização
  // terminar (ver spec).
  @Roles('ADMIN')
  @Permissions('vehicles.manage')
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('sync')
  async sync(): Promise<{ message: string }> {
    await this.fipeManager.triggerSync();
    return { message: 'Sincronização iniciada.' };
  }
}
