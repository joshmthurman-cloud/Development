import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            role: true,
            business: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(userId: string, dto: UpdateUserDto, correlationId: string) {
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new NotFoundException('User not found');

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    await this.auditService.record({
      correlationId,
      userId,
      action: 'user.updated',
      entityType: 'User',
      entityId: userId,
      beforeState: { firstName: before.firstName, lastName: before.lastName },
      afterState: { firstName: user.firstName, lastName: user.lastName },
    });

    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, correlationId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });

    await this.auditService.record({
      correlationId,
      userId,
      action: 'user.password_changed',
      entityType: 'User',
      entityId: userId,
    });

    return { message: 'Password changed successfully' };
  }
}
