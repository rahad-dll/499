import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string, role: string) {
    const user = await this.prisma.users.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        full_name: true,
        phone: true,
        avatar_url: true,
        role: {
          select: {
            name: true,
          },
        },
        owner_profile: {
          select: {
            business_name: true,
            address: true,
          },
        },
        driver_profile: {
          select: {
            driving_licence_no: true,
            licence_type: true,
          },
        },
        authority_profile: {
          select: {
            organization: true,
            badge_number: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const profile = this.buildProfilePayload(user, role);

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      avatar_url: user.avatar_url,
      role: role,
      profile,
    };
  }

  async updateMyProfile(userId: string, role: string, data: Record<string, unknown>) {
    const user = await this.prisma.users.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const { full_name, avatar_url, ...rest } = data as Record<string, unknown>;

    await this.prisma.users.update({
      where: { id: userId },
      data: {
        ...(full_name ? { full_name: full_name as string } : {}),
        ...(avatar_url ? { avatar_url: avatar_url as string } : {}),
      },
    });

    await this.updateRoleSpecificProfile(userId, role, rest);

    return this.getMyProfile(userId, role);
  }

  private buildProfilePayload(user: any, role: string) {
    switch (role) {
      case 'owner':
        return {
          business_name: user.owner_profile?.business_name ?? null,
          address: user.owner_profile?.address ?? null,
        };
      case 'driver':
        return {
          driving_licence_no: user.driver_profile?.driving_licence_no ?? null,
          licence_type: user.driver_profile?.licence_type ?? null,
        };
      case 'authority':
        return {
          organization: user.authority_profile?.organization ?? null,
          badge_number: user.authority_profile?.badge_number ?? null,
        };
      default:
        return {};
    }
  }

  private async updateRoleSpecificProfile(userId: string, role: string, data: Record<string, unknown>) {
    switch (role) {
      case 'owner':
        await this.prisma.owner_profiles.upsert({
          where: { user_id: userId },
          update: data,
          create: { user_id: userId, ...data },
        });
        break;
      case 'driver':
        await this.prisma.driver_profiles.upsert({
          where: { user_id: userId },
          update: data,
          create: { user_id: userId, ...data },
        });
        break;
      case 'authority':
        await this.prisma.authority_profiles.upsert({
          where: { user_id: userId },
          update: data,
          create: { user_id: userId, ...data },
        });
        break;
    }
  }
}
