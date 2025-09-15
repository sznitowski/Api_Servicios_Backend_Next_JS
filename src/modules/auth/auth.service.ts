// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException /*, ForbiddenException*/ } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private async signTokens(user: { id: number; email: string; role: string }) {
    const accessTtl  = this.config.get<string>('JWT_EXPIRES_IN') ?? '15m';
    const refreshTtl = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const refreshSec =
      this.config.get<string>('JWT_REFRESH_SECRET')
      ?? this.config.get<string>('JWT_SECRET')
      ?? 'dev-secret';

    const payload = { sub: user.id, email: user.email, role: user.role };

    const access_token  = await this.jwt.signAsync(payload, { expiresIn: accessTtl });
    const refresh_token = await this.jwt.signAsync(payload, { expiresIn: refreshTtl, secret: refreshSec });

    // ⬇ opcional: incluimos alias camelCase, sin romper los tests (aceptan snake también)
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
      // ⬇ 401 para alinear con la doc del controller
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
