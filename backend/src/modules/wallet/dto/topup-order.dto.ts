import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTopupOrderDto {
  @IsString()
  @IsNotEmpty()
  packageSku: string;
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
