import { IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PdfOptionsDto {
  @IsOptional()
  @IsIn(['A4', 'A3', 'Letter', 'Legal'])
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';

  @IsOptional()
  @IsBoolean()
  landscape?: boolean;

  @IsOptional()
  @IsString()
  marginTop?: string;

  @IsOptional()
  @IsString()
  marginRight?: string;

  @IsOptional()
  @IsString()
  marginBottom?: string;

  @IsOptional()
  @IsString()
  marginLeft?: string;

  @IsOptional()
  @IsString()
  filename?: string;
}

export class GenerateReportDto {
  @IsString()
  @IsNotEmpty()
  template: string;

  @IsObject()
  parameters: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => PdfOptionsDto)
  options?: PdfOptionsDto;
}
