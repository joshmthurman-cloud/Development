import { Controller, Get, Patch, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { CorrelationId } from '../common/decorators/correlation-id.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.usersService.update(user.sub, dto, correlationId);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.usersService.changePassword(user.sub, dto, correlationId);
  }
}
