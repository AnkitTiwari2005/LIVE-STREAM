import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contentType: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  folder?: string;
}
