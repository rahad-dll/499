import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@citypulse.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString() @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Chrome on Windows' })
  @IsOptional() @IsString()
  device_name?: string;
}
