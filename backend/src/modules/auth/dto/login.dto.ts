import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'devotee@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'devotee@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Hex token received via email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecurePassword456!' })
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class VerifyTotpDto {
  @ApiProperty({ description: 'Temporary 2FA challenge token from login' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP authenticator code' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
