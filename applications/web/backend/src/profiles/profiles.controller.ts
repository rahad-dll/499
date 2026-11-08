import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) { }

    @Get('me')
    getMyProfile(@CurrentUser() user: JwtPayload) {
        return this.profilesService.getMyProfile(user.sub, user.role);
    }

    @ApiTags('🆕 New / changed')
    @ApiOperation({
        summary: '🆕 CHANGED 08 Nov · Update my profile (validated)',
        description:
            'Send only the fields to change. Every role: full_name, phone, area_id. ' +
            'Owner: business_name, address. Driver: driving_licence_no, licence_type, date_of_birth, vehicle_classes. ' +
            'Authority: organization, badge_number. Unknown fields or another role\'s fields answer 400. ' +
            'Changing phone sets phone_verified to false. Returns the updated profile (same shape as GET /profiles/me).',
    })
    @ApiBadRequestResponse({ description: 'Invalid value, unknown field, field of another role, or unknown area_id' })
    @ApiConflictResponse({ description: 'Phone number already used by another account' })
    @Patch('me')
    updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMyProfileDto) {
        return this.profilesService.updateMyProfile(user.sub, user.role, dto);
    }
}
