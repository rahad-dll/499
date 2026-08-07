import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    return this.prisma.roles.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async createRole(name: string) {
    const existing = await this.prisma.roles.findFirst({
      where: { name, deleted_at: null },
    });
    if (existing) throw new BadRequestException('Role already exists');

    return this.prisma.roles.create({ data: { name } });
  }

  async updateRole(id: string, name: string) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role || role.deleted_at) throw new NotFoundException('Role not found');

    return this.prisma.roles.update({ where: { id }, data: { name } });
  }

  async deleteRole(id: string) {
    const role = await this.prisma.roles.findUnique({ where: { id } });
    if (!role || role.deleted_at) throw new NotFoundException('Role not found');

    return this.prisma.roles.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async listPermissions() {
    return this.prisma.permissions.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'asc' },
    });
  }

  async createPermission(name: string) {
    const existing = await this.prisma.permissions.findFirst({
      where: { name, deleted_at: null },
    });
    if (existing) throw new BadRequestException('Permission already exists');

    return this.prisma.permissions.create({ data: { name } });
  }

  async listUsers() {
    return this.prisma.users.findMany({
      where: { deleted_at: null },
      include: {
        role: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async assignRole(userId: string, roleId: string) {
    const user = await this.prisma.users.findUnique({ where: { id: userId } });
    if (!user || user.deleted_at) throw new NotFoundException('User not found');

    const role = await this.prisma.roles.findFirst({
      where: { id: roleId, deleted_at: null },
    });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.users.update({
      where: { id: userId },
      data: { role_id: roleId },
    });
  }

  async assignPermission(roleId: string, permissionId: string) {
    const role = await this.prisma.roles.findFirst({
      where: { id: roleId, deleted_at: null },
    });
    if (!role) throw new NotFoundException('Role not found');

    const permission = await this.prisma.permissions.findFirst({
      where: { id: permissionId, deleted_at: null },
    });
    if (!permission) throw new NotFoundException('Permission not found');

    const existing = await this.prisma.role_permissions.findUnique({
      where: {
        role_id_permission_id: { role_id: roleId, permission_id: permissionId },
      },
    });
    if (existing) throw new BadRequestException('Permission already assigned');

    return this.prisma.role_permissions.create({
      data: {
        role_id: roleId,
        permission_id: permissionId,
      },
    });
  }

  async removePermission(roleId: string, permissionId: string) {
    const existing = await this.prisma.role_permissions.findUnique({
      where: {
        role_id_permission_id: { role_id: roleId, permission_id: permissionId },
      },
    });
    if (!existing)
      throw new NotFoundException('Permission assignment not found');

    return this.prisma.role_permissions.delete({
      where: {
        role_id_permission_id: { role_id: roleId, permission_id: permissionId },
      },
    });
  }
}
