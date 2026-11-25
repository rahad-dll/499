"""Canonical Bangla plate vocabulary for the 498R merged recognition set, and the maps from every source's class names.

Every mapping below was checked by eye on crop galleries (logs/peek/cls_kuet.jpg, cls_blpd.jpg, cls_lpdba.jpg) and,
for BLPD, against the English/Bangla ground truth pairs in its external-validation CSV.
All strings are Unicode NFC (NFC keeps য়/ড়/ঢ় decomposed, consistently).
"""
import unicodedata

N = lambda s: unicodedata.normalize('NFC', s)

DIGITS = list('০১২৩৪৫৬৭৮৯')
METRO = 'মেট্রো'
# vehicle-class (series) letters seen on BRTA plates in our sources
LETTERS = ['অ', 'ই', 'উ', 'এ', 'ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ট', 'ঠ', 'ড', 'ঢ', 'ত', 'থ', 'দ', 'ধ',
           'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'স', 'হ']
# the 64 districts, official Bangla spelling
DISTRICTS = ['ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'নরসিংদী', 'মানিকগঞ্জ', 'মুন্সিগঞ্জ', 'টাঙ্গাইল', 'কিশোরগঞ্জ', 'ফরিদপুর',
             'মাদারীপুর', 'গোপালগঞ্জ', 'রাজবাড়ী', 'শরীয়তপুর',
             'চট্টগ্রাম', 'কক্সবাজার', 'রাঙ্গামাটি', 'বান্দরবান', 'খাগড়াছড়ি', 'ফেনী', 'নোয়াখালী', 'লক্ষ্মীপুর', 'কুমিল্লা',
             'চাঁদপুর', 'ব্রাহ্মণবাড়িয়া',
             'রাজশাহী', 'নাটোর', 'নওগাঁ', 'চাঁপাইনবাবগঞ্জ', 'পাবনা', 'সিরাজগঞ্জ', 'বগুড়া', 'জয়পুরহাট',
             'খুলনা', 'বাগেরহাট', 'সাতক্ষীরা', 'যশোর', 'নড়াইল', 'মাগুরা', 'ঝিনাইদহ', 'কুষ্টিয়া', 'চুয়াডাঙ্গা', 'মেহেরপুর',
             'বরিশাল', 'ভোলা', 'পটুয়াখালী', 'বরগুনা', 'ঝালকাঠি', 'পিরোজপুর',
             'সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ',
             'রংপুর', 'দিনাজপুর', 'ঠাকুরগাঁও', 'পঞ্চগড়', 'নীলফামারী', 'লালমনিরহাট', 'কুড়িগ্রাম', 'গাইবান্ধা',
             'ময়মনসিংহ', 'জামালপুর', 'শেরপুর', 'নেত্রকোণা']
# short metro forms printed on plates (Chattogram / Rajshahi metro) and the pre-2014 name of Chapainawabganj
SHORT = ['চট্ট', 'রাজ', 'নবাবগঞ্জ']
CLASSES = [N(x) for x in DIGITS + [METRO] + LETTERS + DISTRICTS + SHORT]
assert len(DISTRICTS) == 64 and len(set(CLASSES)) == len(CLASSES)
CLASS_ID = {c: i for i, c in enumerate(CLASSES)}
KIND = {N(c): ('digit' if c in DIGITS else 'metro' if c == METRO else 'letter' if c in LETTERS else 'district')
        for c in DIGITS + [METRO] + LETTERS + DISTRICTS + SHORT}

# ---- spelling variants -> canonical
VARIANTS = {'নারাইল': 'নড়াইল', 'পটুয়াখালি': 'পটুয়াখালী', 'নীলফামারি': 'নীলফামারী', 'মাদারিপুর': 'মাদারীপুর',
            'শরিয়তপুর': 'শরীয়তপুর', 'চাপাইনবাবগঞ্জ': 'চাঁপাইনবাবগঞ্জ', 'রাঙামাটি': 'রাঙ্গামাটি', 'চট্টো': 'চট্ট',
            'নেত্রকোনা': 'নেত্রকোণা', 'বগুরা': 'বগুড়া', '0': '০'}

# ---- KUET (Hossain & Hassan) English names, checked on cls_kuet.jpg
KUET = {**{str(i): DIGITS[i] for i in range(10)}, 'ka': 'ক', 'kha': 'খ', 'ga': 'গ', 'gha': 'ঘ', 'ca': 'চ', 'ja': 'জ',
        'ta': 'ট', 'da': 'ড', 'na': 'ন', 'ba': 'ব', 'va': 'ভ', 'ha': 'হ', 'metro': METRO, 'dhaka': 'ঢাকা',
        'khulna': 'খুলনা', 'chattogram': 'চট্ট', 'jashore': 'যশোর'}

# ---- BLPD (Sarker & Alam) English names, checked on cls_blpd.jpg and the external-validation CSV
BLPD = {**{str(i): DIGITS[i] for i in range(10)},
        'A': 'অ', 'Ba': 'ব', 'Bha': 'ভ', 'Cha': 'চ', 'Chha': 'ছ', 'DA': 'দ', 'Da': 'ড', 'Dha': 'ঢ', 'E': 'এ',
        'Ga': 'গ', 'Gha': 'ঘ', 'Ha': 'হ', 'Ja': 'জ', 'Jha': 'ঝ', 'Ka': 'ক', 'Kha': 'খ', 'La': 'ল', 'Ma': 'ম',
        'Na': 'ন', 'Pa': 'প', 'Sa': 'স', 'Sha': 'শ', 'THA': 'ঠ', 'Ta': 'ট', 'Tha': 'থ', 'U': 'উ',
        'Metro': METRO, 'Chatto': 'চট্ট', 'Raj': 'রাজ', 'Nowabganj': 'নবাবগঞ্জ',
        'Bagerhat': 'বাগেরহাট', 'Bagura': 'বগুড়া', 'Bandarban': 'বান্দরবান', 'Barguna': 'বরগুনা', 'Barisal': 'বরিশাল',
        'Bhola': 'ভোলা', 'Brahmanbaria': 'ব্রাহ্মণবাড়িয়া', 'Chandpur': 'চাঁদপুর', 'Chapainawabganj': 'চাঁপাইনবাবগঞ্জ',
        'Chattogram': 'চট্টগ্রাম', 'Chuadanga': 'চুয়াডাঙ্গা', 'Cox-s Bazar': 'কক্সবাজার', 'Cox-s-Bazar': 'কক্সবাজার',
        'Cumilla': 'কুমিল্লা', 'Dhaka': 'ঢাকা', 'Dinajpur': 'দিনাজপুর', 'Faridpur': 'ফরিদপুর', 'Feni': 'ফেনী',
        'Gaibandha': 'গাইবান্ধা', 'Gazipur': 'গাজীপুর', 'Gopalganj': 'গোপালগঞ্জ', 'Habiganj': 'হবিগঞ্জ',
        'Jamalpur': 'জামালপুর', 'Jessore': 'যশোর', 'Jhalokati': 'ঝালকাঠি', 'Jhenaidah': 'ঝিনাইদহ',
        'Joypurhat': 'জয়পুরহাট', 'Khagrachari': 'খাগড়াছড়ি', 'Khulna': 'খুলনা', 'Kishoreganj': 'কিশোরগঞ্জ',
        'Kurigram': 'কুড়িগ্রাম', 'Kustia': 'কুষ্টিয়া', 'Lakshmipur': 'লক্ষ্মীপুর', 'Lalmonirhat': 'লালমনিরহাট',
        'Madaripur': 'মাদারীপুর', 'Magura': 'মাগুরা', 'Manikganj': 'মানিকগঞ্জ', 'Meherpur': 'মেহেরপুর',
        'Moulvibazar': 'মৌলভীবাজার', 'Munshiganj': 'মুন্সিগঞ্জ', 'Mymensingh': 'ময়মনসিংহ', 'Naogaon': 'নওগাঁ',
        'Narail': 'নড়াইল', 'Narayanganj': 'নারায়ণগঞ্জ', 'Narsingdi': 'নরসিংদী', 'Natore': 'নাটোর',
        'Netrokona': 'নেত্রকোণা', 'Nilphamari': 'নীলফামারী', 'Noakhali': 'নোয়াখালী', 'Pabna': 'পাবনা',
        'Patuakhali': 'পটুয়াখালী', 'Pirojpur': 'পিরোজপুর', 'Rajbari': 'রাজবাড়ী', 'Rajshahi': 'রাজশাহী',
        'Rangamati': 'রাঙ্গামাটি', 'Rangpur': 'রংপুর', 'Satkhira': 'সাতক্ষীরা', 'Shariatpur': 'শরীয়তপুর',
        'Sherpur': 'শেরপুর', 'Sirajganj': 'সিরাজগঞ্জ', 'Sunamganj': 'সুনামগঞ্জ', 'Sylhet': 'সিলেট',
        'Tangail': 'টাঙ্গাইল', 'Thakurgaon': 'ঠাকুরগাঁও', 'panchagarh': 'পঞ্চগড়'}

# ---- NightLPBD transliterations, checked on cls_night.jpg (syllable boxes are dropped in ingest.py)
NIGHT = {**{str(i): DIGITS[i] for i in range(10)}, 'bo': 'ব', 'co': 'চ', 'go': 'গ', 'ho': 'হ', 'To': 'ট', 'lo': 'ল',
         'Dhaka': 'ঢাকা', 'khulona': 'খুলনা', 'meTrO': METRO, 'zoshOro': 'যশোর'}


# ---- furcifer/bangla-license-plates-synthetic (Kaggle, CC0) lp.names, checked on rendered samples (thaa = থ, daa = দ)
FURCIFER = {**{str(i): DIGITS[i] for i in range(10)}, 'a': 'অ', 'i': 'ই', 'u': 'উ', 'e': 'এ', 'ka': 'ক', 'kha': 'খ',
            'ga': 'গ', 'gha': 'ঘ', 'umno': 'ঙ', 'ca': 'চ', 'cha': 'ছ', 'ja': 'জ', 'jha': 'ঝ', 'tSa': 'ট', 'tSha': 'ঠ',
            'dSa': 'ড', 'dSha': 'ঢ', 'thaa': 'থ', 'daa': 'দ', 'na': 'ন', 'pa': 'প', 'pha': 'ফ', 'ba': 'ব', 'bha': 'ভ',
            'ma': 'ম', 'jSaa': 'য', 'ra': 'র', 'la': 'ল', 'sha': 'শ', 'sa': 'স', 'ha': 'হ', 'dhaka': 'ঢাকা',
            'chittagong': 'চট্টগ্রাম', 'khulna': 'খুলনা', 'kushtia': 'কুষ্টিয়া', 'narayanganj': 'নারায়ণগঞ্জ',
            'bagura': 'বগুড়া', 'comilla': 'কুমিল্লা', 'mymensingh': 'ময়মনসিংহ', 'sylhet': 'সিলেট'}

def canon(source, name):
    """Map a source class name to a canonical class (or None if it cannot be mapped)."""
    if source == 'kuet':
        v = KUET.get(name)
    elif source == 'blpd':
        v = BLPD.get(name)
    elif source == 'nightlpbd':
        v = NIGHT.get(name)
    elif source == 'furcifer':
        v = FURCIFER.get(name)
    else:                                   # lpdba, foggy_bd: Bangla names already
        v = name
    if v is None:
        return None
    v = N(VARIANTS.get(N(v), v))
    v = N(VARIANTS.get(v, v))
    return v if v in CLASS_ID else None


def plate_text(tokens_with_boxes):
    """Plate string from canonical tokens + boxes [[token, x1, y1, x2, y2], ...].
    BRTA layout: top row = district (or short metro form) [মেট্রো] - letter, bottom row = 6 digits (NN-NNNN).
    Rows are taken from the token kind (words vs digits), not from y, so tilted plates still work; y is only used
    to check that the words sit above the digits. Returns (text, valid) where valid = exactly that layout."""
    words = [t for t in tokens_with_boxes if KIND.get(t[0]) == 'district']
    metro = [t for t in tokens_with_boxes if KIND.get(t[0]) == 'metro']
    letters = [t for t in tokens_with_boxes if KIND.get(t[0]) == 'letter']
    digits = [t for t in tokens_with_boxes if KIND.get(t[0]) == 'digit']
    cx = lambda t: (t[1] + t[3]) / 2
    cy = lambda t: (t[2] + t[4]) / 2
    top = ' '.join(t[0] for t in sorted(words, key=cx))
    if metro:
        top = (top + ' ' if top else '') + METRO
    if letters:
        top = (top + '-' if top else '') + ''.join(t[0] for t in sorted(letters, key=cx))
    ds = ''.join(t[0] for t in sorted(digits, key=cx))
    bottom = ds[:2] + '-' + ds[2:] if len(ds) == 6 else ds
    text = (top + ' ' + bottom).strip()
    up = words + metro + letters
    valid = (len(words) == 1 and len(metro) <= 1 and len(letters) == 1 and len(digits) == 6
             and sum(map(cy, up)) / len(up) < sum(map(cy, digits)) / len(digits))
    return text, valid


def norm_text(s):
    """Text used for scoring: NFC, Bangla digits, no spaces/hyphens/dots."""
    s = N(s)
    s = s.translate(str.maketrans('0123456789', '০১২৩৪৫৬৭৮৯'))
    for ch in ' -–—.:,_':
        s = s.replace(ch, '')
    return s


# English transliteration for each canonical class (from the BLPD names, which match BRTA English usage)
ENGLISH = {N(v): k for k, v in BLPD.items() if not k.isdigit() and k not in ('Cox-s-Bazar', 'DA')}
ENGLISH.update({N('দ'): 'DA', N('কক্সবাজার'): "Cox's Bazar", N('ই'): 'I', N('ঙ'): 'Umo', N('ত'): 'Ta (dental)',
                N('ধ'): 'Dha (dental)', N('ফ'): 'Pha', N('য'): 'Ya', N('র'): 'Ra', N('নবাবগঞ্জ'): 'Nawabganj'})
ENGLISH.update({N(d): str(i) for i, d in enumerate(DIGITS)})
ENGLISH[N(METRO)] = 'Metro'


def text_tokens(text):
    """Split a canonical plate text ("ঢাকা মেট্রো-গ ১২-৩৪৫৬") into class tokens: district, [মেট্রো], letter, 6 digits."""
    t = N(text)
    out = []
    head, _, digits = t.rpartition(' ')
    if '-' in head:
        words, _, letter = head.rpartition('-')
    else:
        words, letter = head, ''
    for w in words.split():
        out.append(w)
    if letter:
        out.append(letter)
    out.extend(ch for ch in digits if ch in DIGITS)
    return out


def tokens_to_text(toks):
    """Inverse of text_tokens for a predicted token sequence (any order): district(s) [মেট্রো]-letter DD-DDDD."""
    words = [t for t in toks if KIND.get(t) == 'district']
    metro = [t for t in toks if KIND.get(t) == 'metro']
    letters = [t for t in toks if KIND.get(t) == 'letter']
    digits = ''.join(t for t in toks if KIND.get(t) == 'digit')
    top = ' '.join(words)
    if metro:
        top = (top + ' ' if top else '') + METRO
    if letters:
        top = (top + '-' if top else '') + ''.join(letters)
    bottom = digits[:2] + '-' + digits[2:] if len(digits) == 6 else digits
    return (top + ' ' + bottom).strip()


PUA = 0xE000   # one private-use symbol per token, for libraries that need a 1-character alphabet (PARSeq, fast-plate-ocr)


def sym_alphabet(classes):
    return {c: chr(PUA + i) for i, c in enumerate(classes)}


def text_to_syms(text, classes):
    m = sym_alphabet(classes)
    return ''.join(m[t] for t in text_tokens(text) if t in m)


def syms_to_text(syms, classes):
    inv = {v: k for k, v in sym_alphabet(classes).items()}
    return tokens_to_text([inv[c] for c in syms if c in inv])
