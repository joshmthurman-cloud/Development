import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { Role } from '@prisma/client';

@Injectable()
export class BusinessesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(userId: string, dto: CreateBusinessDto, correlationId: string) {
    const business = await this.prisma.business.create({
      data: {
        name: dto.name,
        members: {
          create: { userId, role: Role.OWNER },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
      },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId: business.id,
      action: 'business.created',
      entityType: 'Business',
      entityId: business.id,
      afterState: { name: business.name },
    });

    return business;
  }

  async findAllForUser(userId: string) {
    return this.prisma.business.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
        _count: { select: { fiscalYears: true } },
      },
    });
  }

  async findById(businessId: string, userId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, members: { some: { userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
        fiscalYears: { orderBy: { year: 'desc' } },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(businessId: string, userId: string, dto: UpdateBusinessDto, correlationId: string) {
    const before = await this.findById(businessId, userId);

    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: { ...(dto.name !== undefined && { name: dto.name }) },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'business.updated',
      entityType: 'Business',
      entityId: businessId,
      beforeState: { name: before.name },
      afterState: { name: updated.name },
    });

    return updated;
  }

  async inviteMember(businessId: string, userId: string, dto: InviteMemberDto, correlationId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!targetUser) throw new NotFoundException('User with that email not found');

    const existing = await this.prisma.businessMember.findUnique({
      where: { userId_businessId: { userId: targetUser.id, businessId } },
    });
    if (existing) throw new ConflictException('User is already a member');

    const member = await this.prisma.businessMember.create({
      data: { userId: targetUser.id, businessId, role: dto.role },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'business.member_invited',
      entityType: 'BusinessMember',
      entityId: member.id,
      afterState: { email: dto.email, role: dto.role },
    });

    return member;
  }

  async updateMemberRole(
    businessId: string,
    memberId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
    correlationId: string,
  ) {
    const member = await this.prisma.businessMember.findFirst({
      where: { id: memberId, businessId },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (member.role === Role.OWNER && dto.role !== Role.OWNER) {
      const ownerCount = await this.prisma.businessMember.count({
        where: { businessId, role: Role.OWNER },
      });
      if (ownerCount <= 1) throw new ForbiddenException('Cannot remove the last owner');
    }

    const updated = await this.prisma.businessMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'business.member_role_updated',
      entityType: 'BusinessMember',
      entityId: memberId,
      beforeState: { role: member.role },
      afterState: { role: dto.role },
    });

    return updated;
  }

  async removeMember(businessId: string, memberId: string, userId: string, correlationId: string) {
    const member = await this.prisma.businessMember.findFirst({
      where: { id: memberId, businessId },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (member.role === Role.OWNER) {
      const ownerCount = await this.prisma.businessMember.count({
        where: { businessId, role: Role.OWNER },
      });
      if (ownerCount <= 1) throw new ForbiddenException('Cannot remove the last owner');
    }

    await this.prisma.businessMember.delete({ where: { id: memberId } });

    await this.auditService.record({
      correlationId,
      userId,
      businessId,
      action: 'business.member_removed',
      entityType: 'BusinessMember',
      entityId: memberId,
      beforeState: { userId: member.userId, role: member.role },
    });

    return { message: 'Member removed' };
  }
}
