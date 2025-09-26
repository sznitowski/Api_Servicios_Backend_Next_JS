import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class JwtOrQueryGuard extends JwtAuthGuard {
  getRequest(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const hasAuth =
      typeof req.headers?.authorization === 'string' &&
      req.headers.authorization.length > 0;

    const qToken = req.query?.access_token as string | undefined;

    if (!hasAuth && qToken) {
      req.headers = req.headers || {};
      req.headers.authorization = `Bearer ${qToken}`;
    }
    return req;
  }
}
