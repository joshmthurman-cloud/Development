import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoggingService } from '../logging/logging.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    private logger: LoggingService,
  ) {}

  async register(dto: RegisterDto, correlationId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    await this.auditService.record({
      correlationId,
      userId: user.id,
      action: 'user.registered',
      entityType: 'User',
      entityId: user.id,
      afterState: { email: user.email, firstName: user.firstName, lastName: user.lastName },
    });

    const tokens = await this.generateTokens(user.id, user.email, correlationId);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto, correlationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      await this.auditService.record({
        correlationId,
        action: 'auth.login_failed',
        entityType: 'User',
        metadata: { email: dto.email, reason: 'user_not_found_or_inactive' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.auditService.record({
        correlationId,
        userId: user.id,
        action: 'auth.login_failed',
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.auditService.record({
      correlationId,
      userId: user.id,
      action: 'auth.login_success',
      entityType: 'User',
      entityId: user.id,
    });

    const tokens = await this.generateTokens(user.id, user.email, correlationId);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string, correlationId: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      await this.auditService.record({
        correlationId,
        action: 'auth.refresh_failed',
        entityType: 'RefreshToken',
        metadata: { reason: !stored ? 'not_found' : stored.revokedAt ? 'revoked' : 'expired' },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      correlationId,
      userId: stored.userId,
      action: 'auth.token_refreshed',
      entityType: 'RefreshToken',
      entityId: stored.id,
    });

    return this.generateTokens(stored.userId, stored.user.email, correlationId);
  }

  async logout(userId: string, correlationId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      correlationId,
      userId,
      action: 'auth.logout',
      entityType: 'User',
      entityId: userId,
    });
  }

  private async generateTokens(userId: string, email: string, correlationId: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret')!,
      expiresIn: this.configService.get<string>('jwt.accessExpiration')! as any,
    });

    const refreshTokenValue = uuidv4();
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiration') || '7d';
    const refreshExpiresMs = this.parseDuration(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt: new Date(Date.now() + refreshExpiresMs),
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] || 1);
  }
}
