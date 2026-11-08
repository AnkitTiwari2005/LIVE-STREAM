import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
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
  // H-02: Added minimum and maximum length — previously any non-empty string was accepted
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must be no more than 128 characters' })
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
