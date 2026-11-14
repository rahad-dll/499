import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { SIGNUP_PASSWORD_RULES } from './dto/password-rules';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 CHANGED 14 Nov · Register',
    description: `Password: ${SIGNUP_PASSWORD_RULES}. A password that breaks a rule answers 400 with the rule in the message.`,
  })
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 08 Nov · Forgot password: email a 6-digit reset code',
    description:
      'Always answers 200 with the same message, whether or not the email has an account. ' +
      'The code is valid 15 minutes; a new code can be requested once a minute (earlier requests are ignored).',
  })
  @ApiOkResponse({ schema: { example: { message: 'If an account exists for this email, a reset code has been sent.' } } })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 08 Nov · Reset password with the emailed code',
    description:
      'Send email, the 6-digit code (token) and new_password (8 to 72 characters). ' +
      'On success every session of the account is signed out, so the user signs in again. ' +
      'Five wrong codes cancel the code; request a new one.',
  })
  @ApiOkResponse({ schema: { example: { message: 'Password has been reset. Please sign in with the new password.' } } })
  @ApiBadRequestResponse({ description: 'Invalid or expired code, or new password too short / too long' })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip;
    const ua = req.headers['user-agent'];
    return this.authService.login(dto, ip, ua);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.jti);
  }

  @ApiTags('🆕 New / changed')
  @ApiOperation({
    summary: '🆕 NEW 08 Nov · Change my password',
    description:
      'Signed-in user sends the current password and a new one (8 to 72 characters). ' +
      'All other devices are signed out; this device stays signed in. ' +
      'A wrong current password answers 400 (not 401), so the app does not treat it as an expired session.',
  })
  @ApiOkResponse({ schema: { example: { message: 'Password changed', signed_out_sessions: 2 } } })
  @ApiBadRequestResponse({ description: 'Wrong current password, new password same as current, too short or too long, or account has no password' })
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }

  @Get('sessions')
  getSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.getSessions(user.sub);
  }

  @Delete('sessions/:id')
  revokeSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.authService.revokeSession(user.sub, id);
  }
}
