import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
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

  // firma tokens con TTLs configurables (v3: usar ?? para defaults)
  private async signTokens(user: { id: number; email: string; role: string }) {
    const accessTtl  = this.config.get<string>('JWT_EXPIRES_IN') ?? '15m';
    const refreshTtl = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    // si no hay JWT_REFRESH_SECRET, cae al JWT_SECRET, y si tampoco, 'dev-secret'
    const refreshSec =
      this.config.get<string>('JWT_REFRESH_SECRET')
      ?? this.config.get<string>('JWT_SECRET')
      ?? 'dev-secret';

    const payload = { sub: user.id, email: user.email, role: user.role };

    // el access usa el secret del JwtModule; no hace falta pasarlo acá
    const access_token  = await this.jwt.signAsync(payload, { expiresIn: accessTtl });

    // el refresh lleva su secret propio
    const refresh_token = await this.jwt.signAsync(payload, { expiresIn: refreshTtl, secret: refreshSec });

    return { access_token, refresh_token };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('User not found');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens({ id: user.id, email: user.email, role: user.role });

    // guarda hash del refresh en DB
    await this.users.setRefreshToken(user.id, await bcrypt.hash(tokens.refresh_token, 10));

    return tokens;
  }

  async refresh(refreshToken: string) {
    // v3: defaults con ??
    const secret =
      this.config.get<string>('JWT_REFRESH_SECRET')
      ?? this.config.get<string>('JWT_SECRET')
      ?? 'dev-secret';

    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(refreshToken, { secret });
    } catch {
      throw new ForbiddenException('Invalid refresh token');
    }

    const user = await this.users.getUserWithRefresh(payload.sub);
    if (!user || !user.refreshTokenHash) throw new ForbiddenException('No refresh token registered');

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) throw new ForbiddenException('Invalid refresh token');

    const tokens = await this.signTokens({ id: user.id, email: user.email, role: user.role });
    await this.users.setRefreshToken(user.id, await bcrypt.hash(tokens.refresh_token, 10));
    return tokens;
  }

  async logout(userId: number) {
    await this.users.setRefreshToken(userId, null);
    return { ok: true };
  }
}
