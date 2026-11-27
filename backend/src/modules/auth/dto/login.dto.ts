import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsBoolean, IsIn } from 'class-validator';
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

export class DeleteAccountDto {
  @ApiProperty({ example: 'SecurePassword123!', required: false, description: 'Required for password-based accounts' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'Ankit Sharma', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  emailNotification?: boolean;

  @ApiProperty({ example: 'en', required: false, enum: ['en', 'hi'] })
  @IsOptional()
  @IsIn(['en', 'hi'])
  preferredLanguage?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!', required: false, description: 'Required when password already exists' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'NewSecurePassword456!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must be no more than 128 characters' })
  newPassword: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({ example: 'CurrentPassword123!', required: false, description: 'Required when account has a password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: '123456', description: 'Current 6-digit TOTP authenticator code or backup code' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
