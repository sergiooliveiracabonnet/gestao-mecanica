import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsString() @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(200) legalName?: string;
  @IsString() @MaxLength(30) document!: string;
  @IsOptional() @IsString() @MaxLength(30) stateRegistration?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(30) whatsapp?: string;
  @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @IsOptional() @IsString() @MaxLength(250) website?: string;
  @IsOptional() @IsString() @MaxLength(200) addressStreet?: string;
  @IsOptional() @IsString() @MaxLength(30) addressNumber?: string;
  @IsOptional() @IsString() @MaxLength(100) addressComplement?: string;
  @IsOptional() @IsString() @MaxLength(100) addressDistrict?: string;
  @IsOptional() @IsString() @MaxLength(100) addressCity?: string;
  @IsOptional() @IsString() @MaxLength(2) addressState?: string;
  @IsOptional() @IsString() @MaxLength(12) addressPostalCode?: string;
  @IsOptional() @IsString() @MaxLength(700000) logoDataUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) documentFooter?: string;
}

export class UpdateEmailSettingsDto {
  @IsOptional() @IsString() @MaxLength(250) host?: string;
  @IsInt() @Min(1) @Max(65535) port!: number;
  @IsBoolean() secure!: boolean;
  @IsOptional() @IsString() @MaxLength(250) username?: string;
  @IsOptional() @IsString() @MaxLength(500) password?: string;
  @IsOptional() @IsString() @MaxLength(160) fromName?: string;
  @IsOptional() @IsEmail() @MaxLength(250) fromEmail?: string;
  @IsOptional() @IsEmail() @MaxLength(250) replyTo?: string;
  @IsBoolean() enabled!: boolean;
}

export class TestEmailSettingsDto {
  @IsEmail() recipient!: string;
}

export class SendEmailDto {
  @IsEmail() recipient!: string;
  @IsString() @MaxLength(200) subject!: string;
  @IsString() @MaxLength(20000) text!: string;
}
