import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Businesses')
@ApiBearerAuth()
@Controller('businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBusinessDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.businessesService.create(user.sub, dto, correlationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all businesses for the current user' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.businessesService.findAllForUser(user.sub);
  }

  @Get(':businessId')
  @ApiOperation({ summary: 'Get a business by ID' })
  async findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.businessesService.findById(businessId, user.sub);
  }

  @Patch(':businessId')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update a business' })
  async update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBusinessDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.businessesService.update(businessId, user.sub, dto, correlationId);
  }

  @Post(':businessId/members')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Invite a member to the business' })
  async inviteMember(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteMemberDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.businessesService.inviteMember(businessId, user.sub, dto, correlationId);
  }

  @Patch(':businessId/members/:memberId')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update a member role' })
  async updateMemberRole(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMemberRoleDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.businessesService.updateMemberRole(businessId, memberId, user.sub, dto, correlationId);
  }

  @Delete(':businessId/members/:memberId')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Remove a member from the business' })
  async removeMember(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: JwtPayload,
    @CorrelationId() correlationId: string,
  ) {
    return this.businessesService.removeMember(businessId, memberId, user.sub, correlationId);
  }
}
