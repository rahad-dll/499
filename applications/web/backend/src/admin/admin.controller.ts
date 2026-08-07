import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength, IsUUID } from 'class-validator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AdminService } from './admin.service';

class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}

class UpdateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;
}

class CreatePermissionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}

class AssignRoleDto {
  @IsUUID()
  role_id: string;
}

class AssignPermissionDto {
  @IsUUID()
  permission_id: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('roles')
  @RequirePermissions('admin.manage_roles')
  listRoles() {
    return this.adminService.listRoles();
  }

  @Post('roles')
  @RequirePermissions('admin.manage_roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.adminService.createRole(dto.name);
  }

  @Patch('roles/:id')
  @RequirePermissions('admin.manage_roles')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateRole(id, dto.name);
  }

  @Delete('roles/:id')
  @RequirePermissions('admin.manage_roles')
  deleteRole(@Param('id') id: string) {
    return this.adminService.deleteRole(id);
  }

  @Get('permissions')
  @RequirePermissions('admin.manage_permissions')
  listPermissions() {
    return this.adminService.listPermissions();
  }

  @Post('permissions')
  @RequirePermissions('admin.manage_permissions')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.adminService.createPermission(dto.name);
  }

  @Get('users')
  @RequirePermissions('admin.manage_users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/role')
  @RequirePermissions('admin.manage_users')
  assignRole(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.adminService.assignRole(id, dto.role_id);
  }

  @Post('roles/:roleId/permissions')
  @RequirePermissions('admin.manage_roles')
  assignPermission(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionDto,
  ) {
    return this.adminService.assignPermission(roleId, dto.permission_id);
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @RequirePermissions('admin.manage_roles')
  removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.adminService.removePermission(roleId, permissionId);
  }
}
