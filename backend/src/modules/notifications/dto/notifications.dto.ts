import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContactInquiryDto {
  @ApiProperty({ example: 'Rohan Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'rohan@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Question regarding upcoming Somnath Aarti' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Can I perform sankalp on behalf of my family?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}

export class GrievanceSubmissionDto {
  @ApiProperty({ example: 'Rohan Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'rohan@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ example: 'Content Grievance / Inappropriate Broadcast' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  complaintType: string;

  @ApiProperty({ example: 'Detailed description of the grievance according to Rule 3(2) IT Rules 2021' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  details: string;
}
