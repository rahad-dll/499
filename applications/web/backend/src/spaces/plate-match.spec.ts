import { comparePlates, parsePlate } from './plate-match';

describe('parsePlate', () => {
  it('reads an English plate', () => {
    expect(parsePlate('Dhaka Metro Ga 12-3456')).toEqual({
      district: 'dhaka',
      metro: true,
      letter: 'ga',
      digits: '123456',
      complete: true,
    });
  });

  it('reads a Bangla plate the same way', () => {
    expect(parsePlate('ঢাকা মেট্রো গ ১২-৩৪৫৬')).toEqual(
      parsePlate('Dhaka Metro Ga 12-3456'),
    );
  });

  it('accepts other spellings and short forms', () => {
    expect(parsePlate("Cox's Bazar Ka 11-2233").district).toBe('coxsbazar');
    expect(parsePlate('Chittagong Metro Ga 12-0191').district).toBe(
      'chattogram',
    );
    expect(parsePlate('চট্ট মেট্রো গ ১২-০১৯১')).toEqual(
      parsePlate('Chattogram Metro Ga 12-0191'),
    );
  });

  it('keeps the two letters that differ only in case apart', () => {
    expect(parsePlate('ড').letter).toBe('dda');
    expect(parsePlate('দ').letter).toBe('da');
  });

  it('marks a plate without a letter or six digits as not complete', () => {
    expect(parsePlate('Dhaka Metro 12-3456').complete).toBe(false);
    expect(parsePlate('DHK-1234').complete).toBe(false);
  });
});

describe('comparePlates', () => {
  it('matches the same plate in any script, case or spacing', () => {
    expect(
      comparePlates('Dhaka Metro Ga 21-8842', 'ঢাকা মেট্রো গ ২১-৮৮৪২'),
    ).toBe('match');
    expect(
      comparePlates('Dhaka Metro Ga 21-8842', 'DHAKA METRO-GA 218842'),
    ).toBe('match');
  });

  it('gives unknown when one place differs', () => {
    expect(
      comparePlates('Dhaka Metro Kha 21-8842', 'Dhaka Metro Ga 21-8842'),
    ).toBe('unknown');
    expect(
      comparePlates('Dhaka Metro Ga 21-8843', 'Dhaka Metro Ga 21-8842'),
    ).toBe('unknown');
  });

  it('gives mismatch for a different car', () => {
    expect(
      comparePlates('Dhaka Metro Ga 33-1576', 'Dhaka Metro Ga 21-8842'),
    ).toBe('mismatch');
    expect(
      comparePlates('Dhaka Metro Gha 17-9664', 'Dhaka Metro Ga 21-8842'),
    ).toBe('mismatch');
  });

  it('gives unknown for a part read or an empty side', () => {
    expect(comparePlates('Dhaka Metro 5534', 'Dhaka Metro Ga 21-8842')).toBe(
      'unknown',
    );
    expect(comparePlates('', 'Dhaka Metro Ga 21-8842')).toBe('unknown');
    expect(comparePlates('Dhaka Metro Ga 21-8842', null)).toBe('unknown');
  });

  it('compares a booking plate in another format as text only', () => {
    expect(comparePlates('DHK-1234', 'dhk 1234')).toBe('match');
    expect(comparePlates('Dhaka Metro Ga 21-8842', 'DHK-1234')).toBe('unknown');
  });
});
