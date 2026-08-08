import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.profilesService.getMyProfile(user.sub, user.role);
  }

  @Patch('me')
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.profilesService.updateMyProfile(user.sub, user.role, body);
  }
}
