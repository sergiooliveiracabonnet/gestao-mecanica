import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PERMISSION_KEYS, type PermissionKey } from '@oficina/contracts';

export class CreateAccessProfileDto {
  @IsString() @MinLength(2) @MaxLength(60) name!: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsArray() @ArrayNotEmpty() permissions!: PermissionKey[];
}
export class UpdateAccessProfileDto extends CreateAccessProfileDto { @IsUUID() id!: string; }
export class AssignUserProfileDto { @IsUUID() userId!: string; @IsUUID() profileId!: string; }

export function hasValidPermissionKeys(keys: PermissionKey[]): boolean {
  return keys.every((key) => PERMISSION_KEYS.includes(key));
}
