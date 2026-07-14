import { IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  refresh_token: string;
}
