import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      users: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      owner_profiles: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      driver_profiles: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      authority_profiles: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    service = new ProfilesService(prisma);
  });

  it('returns the current user profile with role-specific details', async () => {
    prisma.users.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'owner@example.com',
      full_name: 'Owner User',
      phone: '01711111111',
      avatar_url: 'https://cdn.test/avatar.png',
      role: { name: 'owner' },
      owner_profile: { business_name: 'My Parking', address: 'Dhaka' },
    });

    const result = await service.getMyProfile('user-1', 'owner');

    expect(result).toEqual({
      id: 'user-1',
      email: 'owner@example.com',
      full_name: 'Owner User',
      phone: '01711111111',
      avatar_url: 'https://cdn.test/avatar.png',
      role: 'owner',
      profile: {
        business_name: 'My Parking',
        address: 'Dhaka',
      },
    });
  });
});
