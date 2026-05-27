import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginPasswordDto } from './dto/login-password.dto';
import { LoginCodeDto } from './dto/login-code.dto';
import { SendCodeDto } from './dto/send-code.dto';
import { ResetPasswordDto, ChangePasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('send-code')
  @ApiOperation({ summary: '发送邮箱验证码' })
  async sendCode(@Body() dto: SendCodeDto) {
    await this.authService.sendCode(dto.email);
    return { message: '验证码已发送' };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: '邮箱注册' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login/password')
  @ApiOperation({ summary: '密码登录' })
  async loginWithPassword(@Body() dto: LoginPasswordDto) {
    return this.authService.loginWithPassword(dto);
  }

  @Public()
  @Post('login/code')
  @ApiOperation({ summary: '验证码登录' })
  async loginWithCode(@Body() dto: LoginCodeDto) {
    return this.authService.loginWithCode(dto);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新 Token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: '登出（Token 加入黑名单）' })
  async logout(
    @Headers('authorization') auth: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    const accessToken = auth?.replace('Bearer ', '');
    await this.authService.logout(accessToken || '', refreshToken);
    return { message: '已登出' };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: '重置密码（邮箱验证码验证）' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.password);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({ summary: '修改密码（需旧密码）' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.oldPassword, dto.newPassword);
  }
}
