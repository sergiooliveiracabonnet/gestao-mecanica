import { Expose } from 'class-transformer';
import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';
import { FIPE_CATEGORIES } from '@oficina/contracts';
import type { FipeCategory } from '@oficina/contracts';

export class FipeBrandListDto {
  @IsIn(FIPE_CATEGORIES, { message: 'category must be one of CAR, MOTORCYCLE, TRUCK' })
  category!: FipeCategory;
}

// Diferente dos DTOs de body (convertidos snake_case->camelCase pelo
// snakeToCamelMiddleware antes do ValidationPipe), query strings de GET não
// passam por esse middleware — `?brand_id=` chega cru. `@Expose({name})`
// mapeia a chave da query pra a propriedade camelCase, mesma necessidade já
// documentada em NAMING_CONVENTIONS.md pra @QueryValue multi-palavra.
export class FipeModelListDto {
  @Expose({ name: 'brand_id' })
  @IsNotEmpty({ message: 'brand_id is required' })
  @IsUUID('4', { message: 'brand_id must be a valid id' })
  brandId!: string;
}
