import { Controller, Post, Get, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login con usuario y contraseña' })
  async login(@CurrentUser() user: { id: number; username: string }, @Body() _dto: LoginDto) {
    return this.authService.login(user);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil del usuario autenticado con permisos efectivos' })
  getProfile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    // JwtStrategy.validate() already enriches request.user with permissions,
    // userType and tenantId — just return it directly.
    return user;
  }
}
