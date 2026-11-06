import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { firstValueFrom, isObservable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      try {
        // Populate req.user if Bearer token or cookie is present without failing if absent
        const result = super.canActivate(context);
        if (result instanceof Promise) {
          await result;
        } else if (isObservable(result)) {
          await firstValueFrom(result);
        }
      } catch {
        // Ignore authentication failure on public routes
      }
      return true;
    }

    const result = super.canActivate(context);
    if (result instanceof Promise) {
      return await result;
    } else if (isObservable(result)) {
      return await firstValueFrom(result);
    }
    return result;
  }
}
