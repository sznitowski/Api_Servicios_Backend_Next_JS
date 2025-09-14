// src/modules/auth/auth.controller.ts
import { Body, Controller, Get, Post, UseGuards, HttpCode } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user';
import { UsersService } from '../users/users.service';

// 🔽 Swagger
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiProperty,
} from '@nestjs/swagger';

class LoginDto {
  @ApiProperty({ example: 'test@demo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}

class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp…' })
  @IsString()
  refreshToken!: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly users: UsersService) {}

  // ---------- LOGIN ----------
  @ApiOperation({ summary: 'Iniciar sesión', description: 'Devuelve par de tokens (access y refresh).' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login correcto',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXRCJ9…',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Body inválido' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @HttpCode(200)
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  // ---------- ME ----------
  @ApiOperation({ summary: 'Usuario actual', description: 'Devuelve el usuario autenticado.' })
  @ApiOkResponse({
    description: 'Usuario encontrado',
    schema: {
      example: {
        id: 1,
        email: 'test@demo.com',
        name: 'Test',
        role: 'CLIENT',
        active: true,
        createdAt: '2025-01-01T12:00:00.000Z',
        updatedAt: '2025-01-01T12:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: { sub: number }) {
    return this.users.findById(user.sub);
  }

  // ---------- REFRESH ----------
  @ApiOperation({ summary: 'Refrescar tokens', description: 'Intercambia un refresh token válido por nuevos tokens.' })
  @ApiBody({ type: RefreshDto })
  @ApiOkResponse({
    description: 'Tokens renovados',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXRCJ9…',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Body inválido' })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido o expirado' })
  @Post('refresh')
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  // ---------- LOGOUT ----------
  @ApiOperation({ summary: 'Cerrar sesión', description: 'Invalida el refresh token asociado al usuario.' })
  @ApiOkResponse({
    description: 'Logout ok',
    schema: { example: { success: true } },
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @Post('logout')
  logout(@CurrentUser() user: { sub: number }) {
    return this.auth.logout(user.sub);
  }
}
