import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Parol taxmin qilishga qarshi qat'iy chegara: bitta login (telefon/email)
   * uchun daqiqasiga 5 ta urinish.
   *
   * Kalit sifatida IP emas, LOGIN olinadi — ofisdagi xodimlar bitta tashqi IP
   * ortida bo'lishi mumkin va bir-birining kirishini to'sib qo'ymasligi kerak.
   * Bitta IP'dan ommaviy urinish esa app.module.ts dagi "login-ip" chegarasi
   * (20/daqiqa) bilan to'siladi.
   */
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
      getTracker: (req) =>
        String(req?.body?.login ?? '')
          .trim()
          .toLowerCase() || String(req?.ip ?? 'unknown'),
    },
  })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** Refresh tez-tez chaqiriladi — me'yoriy chegara: IP bo'yicha 30/daqiqa. */
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
