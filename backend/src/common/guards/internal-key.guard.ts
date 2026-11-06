import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const internalKey = request.headers['x-internal-key'];
    const expectedKey = process.env.INTERNAL_KEY;

    if (!expectedKey || !internalKey || internalKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing internal service key');
    }
    return true;
  }
}
