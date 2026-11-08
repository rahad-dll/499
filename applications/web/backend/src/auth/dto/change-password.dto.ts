import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(1)
  current_password: string;

  // bcrypt only uses the first 72 bytes, so longer passwords are refused rather than cut
  @ApiProperty({ example: 'newpassword456', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  new_password: string;
}
