import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTopupOrderDto {
  @IsString()
  @IsOptional()
  packageSku?: string;

  @IsString()
  @IsOptional()
  sku?: string;
}

export class VerifyTopupDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsString()
  @IsOptional()
  signature?: string;
}
