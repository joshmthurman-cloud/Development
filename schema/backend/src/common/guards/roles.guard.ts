import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('No authenticated user');

    const businessId =
      request.params.businessId || request.body?.businessId || request.query?.businessId;
    if (!businessId) throw new ForbiddenException('Business context required');

    const membership = await this.prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: user.sub,
          businessId,
        },
      },
    });

    if (!membership) throw new ForbiddenException('Not a member of this business');

    const roleHierarchy: Record<Role, number> = {
      OWNER: 4,
      ADMIN: 3,
      EDITOR: 2,
      VIEWER: 1,
    };

    const userLevel = roleHierarchy[membership.role];
    const requiredLevel = Math.min(...requiredRoles.map((r) => roleHierarchy[r]));

    if (userLevel < requiredLevel) {
      throw new ForbiddenException('Insufficient role for this action');
    }

    request.businessMembership = membership;
    return true;
  }
}
