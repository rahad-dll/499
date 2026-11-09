import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'driver1@citypulse.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '482913', description: '6-digit code from the reset email' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'token must be the 6-digit code from the email' })
  token: string;

  // bcrypt only uses the first 72 bytes, so longer passwords are refused rather than cut
  @ApiProperty({ example: 'newpassword123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  new_password: string;
}
