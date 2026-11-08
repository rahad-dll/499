import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_FIELDS, UpdateMyProfileDto } from './dto/update-my-profile.dto';

@Injectable()
export class ProfilesService {
    constructor(private readonly prisma: PrismaService) { }

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
                        date_of_birth: true,
                        vehicle_classes: true,
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

    async updateMyProfile(userId: string, role: string, dto: UpdateMyProfileDto) {
        const user = await this.prisma.users.findUniqueOrThrow({
            where: { id: userId },
            select: { id: true, phone: true },
        });

        if (!user) {
            throw new NotFoundException('User profile not found');
        }

        // DTO class fields exist even when not sent, so keep only the ones the client sent
        const { full_name, phone, area_id, ...rest } = dto;
        const roleData = Object.fromEntries(
            Object.entries(rest).filter(([, value]) => value !== undefined),
        ) as Partial<typeof rest>;

        // fields of another role are a client mistake, not something to ignore silently
        const allowed: readonly string[] = ROLE_FIELDS[role as keyof typeof ROLE_FIELDS] ?? [];
        const foreign = Object.keys(roleData).filter((key) => !allowed.includes(key));
        if (foreign.length) {
            throw new BadRequestException(`Not a ${role} field: ${foreign.join(', ')}`);
        }

        if (area_id) {
            const area = await this.prisma.areas.findUnique({ where: { id: area_id }, select: { id: true } });
            if (!area) throw new BadRequestException('area_id does not exist');
        }

        const phoneChanged = phone != null && phone !== user.phone;
        try {
            await this.prisma.users.update({
                where: { id: userId },
                data: {
                    ...(full_name != null && { full_name: full_name.trim() }),
                    ...(phoneChanged && { phone, phone_verified: false }),
                    ...(area_id && { area_id }),
                },
            });
        } catch (error) {
            if ((error as { code?: string })?.code === 'P2002') {
                throw new ConflictException('This phone number is already used by another account');
            }
            throw error;
        }

        if (Object.keys(roleData).length) {
            const { date_of_birth, ...rest } = roleData;
            await this.updateRoleSpecificProfile(userId, role, {
                ...rest,
                ...(date_of_birth !== undefined && { date_of_birth: date_of_birth ? new Date(date_of_birth) : null }),
            });
        }

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
                    date_of_birth: user.driver_profile?.date_of_birth?.toISOString().slice(0, 10) ?? null,
                    vehicle_classes: user.driver_profile?.vehicle_classes ?? [],
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

    private async updateRoleSpecificProfile(userId: string, role: string, data: Record<string, any>) {
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
