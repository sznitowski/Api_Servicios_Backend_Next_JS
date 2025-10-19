// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule /*, JwtModuleOptions*/ } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Helper: '15m' | '7d' | '900' → segundos
function parseTtlToSeconds(input: unknown, fallback: number): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input !== 'string') return fallback;
  const s = input.trim().toLowerCase();
  const m = /^(\d+)\s*([smhdw])?$/.exec(s);
  if (!m) return fallback;
  const n = parseInt(m[1], 10);
  const unit = m[2] ?? 's';
  const mult =
    unit === 's' ? 1 :
    unit === 'm' ? 60 :
    unit === 'h' ? 3600 :
    unit === 'd' ? 86400 :
    unit === 'w' ? 604800 : 1;
  return n * mult;
}

@Module({
  imports: [
    UsersModule,

    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET', 'dev-secret');
        // por defecto 1h (antes: '3600s')
        const accessTtlSec = parseTtlToSeconds(
          config.get('JWT_EXPIRES_IN') ?? '3600s',
          3600,
        );
        return {
          secret,
          signOptions: {
            expiresIn: accessTtlSec, // number → evita TS2322
          },
        };
      },
    }),
  ],

  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard],
})
export class AuthModule {}
