import { IsEmail, IsNotEmpty, IsString, MinLength, IsBoolean, Equals } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'devotee@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ankit Sharma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: true, description: 'Mandatory self-declaration confirming 18+ age per DPDP Act 2023' })
  @IsBoolean()
  @Equals(true, { message: 'You must confirm you are 18 years of age or older to register.' })
  isAgeConfirmed18Plus: boolean;
}
