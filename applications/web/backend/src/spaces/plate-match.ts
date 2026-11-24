/**
 * Compares a plate read by the AI with the plate on a booking.
 * Both may be in English or Bangla, e.g. "Dhaka Metro Ga 12-3456" or "ঢাকা মেট্রো গ ১২-৩৪৫৬".
 */

export type PlateMatch = 'match' | 'mismatch' | 'unknown';

interface Plate {
  district: string | null;
  metro: boolean;
  letter: string | null;
  digits: string;
  complete: boolean; // a series letter and six digits
}

const DISTRICTS: Record<string, string> = {
  Bagerhat: 'বাগেরহাট',
  Bagura: 'বগুড়া',
  Bandarban: 'বান্দরবান',
  Barguna: 'বরগুনা',
  Barisal: 'বরিশাল',
  Bhola: 'ভোলা',
  Brahmanbaria: 'ব্রাহ্মণবাড়িয়া',
  Chandpur: 'চাঁদপুর',
  Chapainawabganj: 'চাঁপাইনবাবগঞ্জ',
  Chattogram: 'চট্টগ্রাম',
  Chuadanga: 'চুয়াডাঙ্গা',
  CoxsBazar: 'কক্সবাজার',
  Cumilla: 'কুমিল্লা',
  Dhaka: 'ঢাকা',
  Dinajpur: 'দিনাজপুর',
  Faridpur: 'ফরিদপুর',
  Feni: 'ফেনী',
  Gaibandha: 'গাইবান্ধা',
  Gazipur: 'গাজীপুর',
  Gopalganj: 'গোপালগঞ্জ',
  Habiganj: 'হবিগঞ্জ',
  Jamalpur: 'জামালপুর',
  Jessore: 'যশোর',
  Jhalokati: 'ঝালকাঠি',
  Jhenaidah: 'ঝিনাইদহ',
  Joypurhat: 'জয়পুরহাট',
  Khagrachari: 'খাগড়াছড়ি',
  Khulna: 'খুলনা',
  Kishoreganj: 'কিশোরগঞ্জ',
  Kurigram: 'কুড়িগ্রাম',
  Kustia: 'কুষ্টিয়া',
  Lakshmipur: 'লক্ষ্মীপুর',
  Lalmonirhat: 'লালমনিরহাট',
  Madaripur: 'মাদারীপুর',
  Magura: 'মাগুরা',
  Manikganj: 'মানিকগঞ্জ',
  Meherpur: 'মেহেরপুর',
  Moulvibazar: 'মৌলভীবাজার',
  Mymensingh: 'ময়মনসিংহ',
  Naogaon: 'নওগাঁ',
  Narail: 'নড়াইল',
  Narayanganj: 'নারায়ণগঞ্জ',
  Narsingdi: 'নরসিংদী',
  Natore: 'নাটোর',
  Netrokona: 'নেত্রকোনা',
  Nilphamari: 'নীলফামারী',
  Noakhali: 'নোয়াখালী',
  Nowabganj: 'নবাবগঞ্জ',
  Pabna: 'পাবনা',
  Panchagarh: 'পঞ্চগড়',
  Patuakhali: 'পটুয়াখালী',
  Pirojpur: 'পিরোজপুর',
  Rajbari: 'রাজবাড়ী',
  Rajshahi: 'রাজশাহী',
  Rangamati: 'রাঙ্গামাটি',
  Rangpur: 'রংপুর',
  Satkhira: 'সাতক্ষীরা',
  Shariatpur: 'শরীয়তপুর',
  Sherpur: 'শেরপুর',
  Sirajganj: 'সিরাজগঞ্জ',
  Sunamganj: 'সুনামগঞ্জ',
  Sylhet: 'সিলেট',
  Tangail: 'টাঙ্গাইল',
  Thakurgaon: 'ঠাকুরগাঁও',
};

// other common spellings
const DISTRICT_ALIASES: Record<string, string> = {
  chittagong: 'chattogram',
  comilla: 'cumilla',
  bogura: 'bagura',
  bogra: 'bagura',
  jashore: 'jessore',
  kushtia: 'kustia',
  barishal: 'barisal',
  jhalakathi: 'jhalokati',
  netrakona: 'netrokona',
  moulvibazaar: 'moulvibazar',
};

// short forms written before "Metro"
const SHORT_FORMS: Record<string, string> = {
  chatto: 'chattogram',
  চট্ট: 'chattogram',
  raj: 'rajshahi',
  রাজ: 'rajshahi',
};

// same spellings as the AI service: ড Dda, দ Da, ঠ Ttha, থ Tha
const LETTERS: Record<string, string> = {
  a: 'অ',
  ba: 'ব',
  bha: 'ভ',
  cha: 'চ',
  chha: 'ছ',
  da: 'দ',
  dda: 'ড',
  dha: 'ঢ',
  e: 'এ',
  ga: 'গ',
  gha: 'ঘ',
  ha: 'হ',
  ja: 'জ',
  jha: 'ঝ',
  ka: 'ক',
  kha: 'খ',
  la: 'ল',
  ma: 'ম',
  na: 'ন',
  pa: 'প',
  sa: 'স',
  sha: 'শ',
  ttha: 'ঠ',
  ta: 'ট',
  tha: 'থ',
  u: 'উ',
};

const key = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^a-z0-9ঀ-৿]/g, '');

const DISTRICT_BY_KEY = new Map<string, string>();
for (const [en, bn] of Object.entries(DISTRICTS)) {
  DISTRICT_BY_KEY.set(key(en), key(en));
  DISTRICT_BY_KEY.set(key(bn), key(en));
}
for (const [alias, en] of Object.entries(DISTRICT_ALIASES))
  DISTRICT_BY_KEY.set(alias, en);
for (const [short, en] of Object.entries(SHORT_FORMS))
  DISTRICT_BY_KEY.set(key(short), en);

const LETTER_BY_KEY = new Map<string, string>();
for (const [en, bn] of Object.entries(LETTERS)) {
  LETTER_BY_KEY.set(en, en);
  LETTER_BY_KEY.set(key(bn), en);
}

const METRO = new Set(['metro', key('মেট্রো')]);
const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

export function parsePlate(text: string): Plate {
  const ascii = text
    .normalize('NFC')
    .replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)))
    .replace(/['’]/g, '');
  const tokens = ascii
    .split(/[^A-Za-z0-9ঀ-৿]+/)
    .map(key)
    .filter(Boolean);

  const plate: Plate = {
    district: null,
    metro: false,
    letter: null,
    digits: '',
    complete: false,
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const pair = i + 1 < tokens.length ? t + tokens[i + 1] : '';
    if (/^\d+$/.test(t)) plate.digits += t;
    else if (METRO.has(t)) plate.metro = true;
    else if (pair && DISTRICT_BY_KEY.has(pair)) {
      plate.district = DISTRICT_BY_KEY.get(pair)!; // two-word names such as "Coxs Bazar"
      i++;
    } else if (DISTRICT_BY_KEY.has(t)) plate.district = DISTRICT_BY_KEY.get(t)!;
    else if (LETTER_BY_KEY.has(t)) plate.letter = LETTER_BY_KEY.get(t)!;
  }
  plate.complete = plate.letter !== null && plate.digits.length === 6;
  return plate;
}

/**
 * match: same plate. mismatch: a full read that differs in two or more places.
 * unknown: no full read, a booking plate that is not a full plate, or one place differs (could be a misread).
 */
export function comparePlates(
  read: string | null | undefined,
  booked: string | null | undefined,
): PlateMatch {
  if (!read?.trim() || !booked?.trim()) return 'unknown';

  const r = parsePlate(read);
  const b = parsePlate(booked);
  if (!b.complete) return key(read) === key(booked) ? 'match' : 'unknown';
  if (!r.complete) return 'unknown';

  let differences =
    Number(r.district !== b.district) +
    Number(r.metro !== b.metro) +
    Number(r.letter !== b.letter);
  for (let i = 0; i < 6; i++)
    differences += Number(r.digits[i] !== b.digits[i]);

  if (differences === 0) return 'match';
  return differences === 1 ? 'unknown' : 'mismatch';
}
