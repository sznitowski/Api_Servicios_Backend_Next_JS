// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException /*, ForbiddenException*/ } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private async signTokens(user: { id: number; email: string; role: string }) {
    const accessTtlSec  = parseTtlToSeconds(this.config.get('JWT_EXPIRES_IN') ?? '15m', 15 * 60);
    const refreshTtlSec = parseTtlToSeconds(this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d', 7 * 24 * 3600);

    const refreshSec =
      this.config.get<string>('JWT_REFRESH_SECRET')
      ?? this.config.get<string>('JWT_SECRET')
      ?? 'dev-secret';

    const payload = { sub: user.id, email: user.email, role: user.role };

    const access_token  = await this.jwt.signAsync(payload, { expiresIn: accessTtlSec });
    const refresh_token = await this.jwt.signAsync(payload, { expiresIn: refreshTtlSec, secret: refreshSec });

    return {
      access_token,
      refresh_token,
      accessToken: access_token,
      refreshToken: refresh_token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('User not found');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens({ id: user.id, email: user.email, role: user.role });
    await this.users.setRefreshToken(user.id, await bcrypt.hash(tokens.refresh_token, 10));
    return tokens;
  }

  async refresh(refreshToken: string) {
    const secret =
      this.config.get<string>('JWT_REFRESH_SECRET')
      ?? this.config.get<string>('JWT_SECRET')
      ?? 'dev-secret';

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.getUserWithRefresh(payload.sub);
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('No refresh token registered');

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.signTokens({ id: user.id, email: user.email, role: user.role });
    await this.users.setRefreshToken(user.id, await bcrypt.hash(tokens.refresh_token, 10));
    return tokens;
  }

  async logout(userId: number) {
    await this.users.setRefreshToken(userId, null);
    return { ok: true };
  }
}
