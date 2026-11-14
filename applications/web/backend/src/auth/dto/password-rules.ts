import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const SIGNUP_PASSWORD_RULES =
  '8 to 72 characters with at least one uppercase letter (A-Z) and one number (0-9)';

export function IsSignupPassword() {
  return applyDecorators(
    ApiProperty({ example: 'Passw0rd!', minLength: 8, maxLength: 72, description: SIGNUP_PASSWORD_RULES }),
    IsString(),
    MinLength(8, { message: 'Password must be at least 8 characters' }),
    MaxLength(72, { message: 'Password must be at most 72 characters' }),
    Matches(/[A-Z]/, { message: 'Password must contain an uppercase letter (A-Z)' }),
    Matches(/[0-9]/, { message: 'Password must contain a number (0-9)' }),
  );
}
