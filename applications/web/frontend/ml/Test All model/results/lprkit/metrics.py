"""OCR scoring and fusion for Bangla plates.

Texts are compared after vocab.norm_text (NFC, Bangla digits, no spaces/hyphens), so "ঢাকা মেট্রো-গ ১২-৩৪৫৬" and
"ঢাকামেট্রোগ১২৩৪৫৬" are the same plate. Three views of one prediction:
  plate exact  : whole plate right
  CER          : Unicode character edit distance / truth length (what papers #1, #32 report)
  token acc    : 1 - token edit distance / truth tokens; tokens = district, মেট্রো, letter, 6 digits (vocab.text_tokens)
  WER          : word edit distance / truth words (words = parts between spaces and hyphens)
"""
import collections

try:
    from . import vocab
except ImportError:
    import vocab


def lev(a, b):
    """Edit distance between two sequences (str or list)."""
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def tokens(text):
    t = vocab.N(text or '')
    try:
        return vocab.text_tokens(t)
    except Exception:
        return list(vocab.norm_text(t))


def words(text):
    """Words for WER (papers #1, #32): the plate text split at spaces and hyphens, digits as one word per group."""
    t = vocab.N(text or '')
    for d, b in zip('0123456789', vocab.DIGITS):
        t = t.replace(d, b)
    return t.replace('-', ' ').split()


def score_rows(rows):
    """rows: iterable of (pred_text, true_text). Returns aggregate metrics in %."""
    n = exact = ce = cl = te = tl = we = wl = 0
    for pred, true in rows:
        p, t = vocab.norm_text(pred or ''), vocab.norm_text(true)
        pw, tw = words(pred), words(true)
        we += lev(pw, tw)
        wl += max(1, len(tw))
        n += 1
        exact += int(p == t)
        ce += lev(p, t)
        cl += max(1, len(t))
        pt, tt = tokens(pred), tokens(true)
        te += lev(pt, tt)
        tl += max(1, len(tt))
    return {'plates': n, 'plate_exact_%': round(100 * exact / max(1, n), 2), 'CER_%': round(100 * ce / max(1, cl), 2),
            'char_acc_%': round(max(0.0, 100 * (1 - ce / max(1, cl))), 2), 'token_acc_%': round(max(0.0, 100 * (1 - te / max(1, tl))), 2),
            'WER_%': round(100 * we / max(1, wl), 2)}


def fuse(preds, how='MV-HC', best_model=None):
    """preds: list of (model_name, text, confidence) for ONE plate. Returns the fused text.
    HC: most confident; MV-HC / MV-BM: most frequent normalised string, ties by confidence / by best_model;
    MVCP-HC: vote per token position (tokens padded to the longest), ties by confidence.
    MV-BM+format (ours, not in paper #24): drop readings that break the BRTA layout (is_valid_plate), then MV-BM;
    if no reading fits the layout, MV-BM on all of them."""
    if not preds:
        return ''
    if how == 'HC':
        return max(preds, key=lambda x: x[2])[1]
    if how == 'MV-BM+format':
        return fuse([p for p in preds if is_valid_plate(p[1])] or preds, 'MV-BM', best_model)
    if how.startswith('MV') and not how.startswith('MVCP'):
        groups = collections.defaultdict(list)
        for m, t, c in preds:
            groups[vocab.norm_text(t)].append((m, t, c))
        top = max(len(v) for v in groups.values())
        tied = [v for v in groups.values() if len(v) == top]
        if len(tied) == 1:
            return tied[0][0][1]
        if how == 'MV-BM' and best_model is not None:
            for v in tied:
                if any(m == best_model for m, _, _ in v):
                    return v[0][1]
        return max(tied, key=lambda v: sum(c for _, _, c in v) / len(v))[0][1]
    if how.startswith('MVCP'):
        toks = [(tokens(t), c) for _, t, c in preds]
        L = max(len(t) for t, _ in toks)
        out = []
        for i in range(L):
            votes = collections.defaultdict(list)
            for t, c in toks:
                votes[t[i] if i < len(t) else ''].append(c)
            top = max(len(v) for v in votes.values())
            cands = [(k, max(v)) for k, v in votes.items() if len(v) == top]
            out.append(max(cands, key=lambda kv: kv[1])[0])
        toks_out = [x for x in out if x]
        return ' '.join(toks_out)
    raise ValueError(how)


EXTRA_TESTS = ('test_fog', 'test_rain_synth')     # extra OCR test splits of the 498R dataset (ocr/<name>.csv)


def condition_scores(preds, root):
    """preds: dicts with file / pred / true on the real OCR test split -> scores per condition tag
    (ocr/test_conditions.csv of the 498R dataset: clear, night, blurry, low_res). None if the file is missing."""
    import csv
    import os
    f = os.path.join(root, 'ocr', 'test_conditions.csv')
    if not os.path.exists(f):
        return None
    tags = {r['file']: r for r in csv.DictReader(open(f, encoding='utf-8'))}
    out = {}
    for tag in ('clear', 'night', 'blurry', 'low_res'):
        rows = [(p['pred'], p['true']) for p in preds if tags.get(p['file'], {}).get(tag) == '1']
        if rows:
            out[tag] = score_rows(rows)
    return out


def extra_splits(root):
    import os
    return [s for s in EXTRA_TESTS if os.path.exists(os.path.join(root, 'ocr', f'{s}.csv'))]


def is_valid_plate(text):
    """True if the text parses as one BRTA plate: district [মেট্রো] letter + 6 digits."""
    tk = tokens(text)
    kinds = [vocab.KIND.get(t, '?') for t in tk]
    return (kinds.count('district') == 1 and kinds.count('letter') == 1 and kinds.count('digit') == 6
            and kinds.count('metro') <= 1 and '?' not in kinds)


def mcnemar_exact(b, c):
    """Exact two-sided McNemar test on paired plates: b = plates only system A reads right, c = only system B.
    Binomial test of min(b, c) against Bin(b + c, 0.5). Returns p (1.0 when the two never disagree)."""
    import math
    n = b + c
    if n == 0:
        return 1.0
    p = sum(math.comb(n, i) for i in range(min(b, c) + 1)) / 2 ** n
    return round(min(1.0, 2 * p), 4)
