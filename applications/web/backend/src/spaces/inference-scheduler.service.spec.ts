import { ConfigService } from '@nestjs/config';
import { InferenceSchedulerService } from './inference-scheduler.service';

describe('InferenceSchedulerService.analyseCamera', () => {
  const camera = {
    id: 'cam-1',
    space_id: 'space-1',
    frame_key: 'camera-frames/cam-1.jpg',
    slots: [
      { id: 'slot-a', bbox: { x1: 0.1, y1: 0.5, x2: 0.2, y2: 0.7 } },
      { id: 'slot-b', bbox: { x1: 0.3, y1: 0.5, x2: 0.4, y2: 0.7 } },
      { id: 'slot-c', bbox: { x1: 0.5, y1: 0.5, x2: 0.6, y2: 0.7 } },
      { id: 'slot-no-box', bbox: null },
    ],
  };
  const aiSlots = [
    {
      slot_id: 'slot-a',
      prediction: { label: 'occupied', confidence: 0.99 },
      plates: [{ text_en: 'Dhaka Metro Ga 21-8842', confidence: 0.9 }],
    },
    {
      slot_id: 'slot-b',
      prediction: { label: 'occupied', confidence: 0.99 },
      plates: [{ text_en: 'Dhaka Metro Ga 33-1576', confidence: 0.9 }],
    },
    {
      slot_id: 'slot-c',
      prediction: { label: 'empty', confidence: 0.98 },
      plates: [],
    },
  ];

  let prisma: any;
  let fetchMock: jest.Mock;
  let service: InferenceSchedulerService;

  beforeEach(() => {
    prisma = {
      cameras: { findFirst: jest.fn().mockResolvedValue(camera) },
      bookings: {
        findFirst: jest.fn(({ where }) =>
          Promise.resolve(
            where.slot_id === 'slot-a'
              ? { id: 'b1', vehicle_plate: 'ঢাকা মেট্রো গ ২১-৮৮৪২' }
              : null,
          ),
        ),
      },
      parking_slots: { update: jest.fn().mockResolvedValue({}) },
    };
    fetchMock = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ slots: aiSlots }),
      });
    global.fetch = fetchMock;
    const config = {
      get: (_k: string, d?: string) => d,
    } as unknown as ConfigService;
    service = new InferenceSchedulerService(prisma, config);
  });

  it('sends the slot boxes and updates each slot', async () => {
    const updated = await service.analyseCamera('cam-1', Buffer.from('jpeg'));
    expect(updated).toBe(3);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      '/api/v1/inference/frame?space_id=space-1&camera_id=cam-1',
    );
    const sent = JSON.parse((init.body as FormData).get('slots') as string);
    expect(sent.map((s: { slot_id: string }) => s.slot_id)).toEqual([
      'slot-a',
      'slot-b',
      'slot-c',
    ]);

    const data = Object.fromEntries(
      prisma.parking_slots.update.mock.calls.map(([arg]: any) => [
        arg.where.id,
        arg.data,
      ]),
    );
    expect(data['slot-a']).toMatchObject({
      occupied: true,
      plate_text: 'Dhaka Metro Ga 21-8842',
      plate_check: 'match',
    });
    expect(data['slot-a'].confidence_score).toBeUndefined();
    expect(data['slot-b']).toMatchObject({
      occupied: true,
      confidence_score: 0.99,
      plate_check: 'no_booking',
    });
    expect(data['slot-c']).toMatchObject({
      occupied: false,
      plate_text: null,
      plate_check: null,
    });
  });

  it('does nothing for a camera without a picture or without boxes', async () => {
    prisma.cameras.findFirst.mockResolvedValueOnce({
      ...camera,
      frame_key: null,
    });
    expect(await service.analyseCamera('cam-1')).toBe(0);
    prisma.cameras.findFirst.mockResolvedValueOnce({
      ...camera,
      slots: [{ id: 'x', bbox: null }],
    });
    expect(await service.analyseCamera('cam-1', Buffer.from('jpeg'))).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
