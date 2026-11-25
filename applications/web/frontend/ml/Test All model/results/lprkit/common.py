"""Shared helpers for the 498R paper notebooks (Kaggle GPU T4 x2).

  find_dataset()          -> folder that holds dataset_manifest.json (the "498R BanglaLPR All-in-One" dataset)
  data_yaml(part, kind)   -> absolute-path YOLO yaml for detection / recognition (kind 'all' or 'human')
  run_on_gpus(jobs)       -> start one command per GPU at the same time, wait, return exit codes
  env_info(), save_json(), load_json(), timer
"""
import glob
import json
import os
import platform
import subprocess
import sys
import time

WORK = os.environ.get('LPR_WORK', '/kaggle/working')
WORKERS = int(os.environ.get('LPR_WORKERS', 4))     # DataLoader workers (0 for local Windows tests)


# The team copy of the dataset (Google Drive folder "All In One 1.1", shared with the team). v1.0 (runs up to 20 Oct
# 2026) stays in folder "All In One" (1RLwSI5_YINfJr7tymuKBa8Hxkp0dKKSK), file id 1GGVA0Plxxh6uvRuiDVGEOjiWENHXxmv-.
DRIVE_FOLDER = 'https://drive.google.com/drive/folders/11psdzW5Cpr7tXwqzqNxNt3LA-qeDSOQl'
DRIVE_ZIP_ID = '1PPM6ONnkXYkBNJ5DEM94Pa941cBwbDOg'          # BanglaLPR_AllInOne_v1_1.zip (v1.1, 3.63 GB)
DATASET_VERSION = '1.1'                                     # "version" in dataset_manifest.json that the kits expect
DOWNLOAD_DIR = '/tmp/498r_data' if os.path.exists('/kaggle') else os.path.expanduser('~/498r_data')
_version_warned = set()


def _check_version(root):
    """Warn (once per folder) when the dataset found is not the expected version, e.g. an old v1.0 Kaggle input or an
    old unpacked copy, which find_dataset() would otherwise use without a word."""
    try:
        v = json.load(open(os.path.join(root, 'dataset_manifest.json'), encoding='utf-8')).get('version', '?')
    except (OSError, ValueError):
        v = '?'
    if v != DATASET_VERSION and root not in _version_warned:
        _version_warned.add(root)
        print(f'WARNING: the dataset at {root} is version {v}, these notebooks expect v{DATASET_VERSION}. Remove that '
              f'input / folder to download v{DATASET_VERSION} from {DRIVE_FOLDER}, unless you re-run an old result.',
              flush=True)
    return root


def _search():
    for base in ('/kaggle/input', DOWNLOAD_DIR, os.path.expanduser('~/data'), '/content', '.'):
        hits = sorted(glob.glob(os.path.join(base, '**', 'dataset_manifest.json'), recursive=True), key=len)
        if hits:
            return os.path.dirname(hits[0])
    return None


def download_dataset(dest=DOWNLOAD_DIR, file_id=DRIVE_ZIP_ID):
    """Download the dataset zip from the team Google Drive and unpack it (about 3-6 min on Kaggle). It goes to /tmp on
    Kaggle, so the 3.6 GB are NOT saved as notebook output."""
    import shutil
    import urllib.request
    import zipfile
    os.makedirs(dest, exist_ok=True)
    z = os.path.join(dest, 'BanglaLPR_AllInOne.zip')
    url = f'https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t'
    print(f'dataset not attached -> downloading it from the team Drive ({DRIVE_FOLDER})', flush=True)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)'})
            with urllib.request.urlopen(req, timeout=120) as r, open(z, 'wb') as f:
                if 'text/html' in r.headers.get('Content-Type', ''):
                    raise OSError('Google Drive sent a web page instead of the file (download quota reached?)')
                total, done, step = int(r.headers.get('Content-Length') or 0), 0, 0
                while True:
                    b = r.read(1 << 22)
                    if not b:
                        break
                    f.write(b); done += len(b)
                    if done >= step:
                        print(f'  {done / 2 ** 30:.2f} / {total / 2 ** 30:.2f} GB', flush=True); step += 500 * 2 ** 20
            if total and os.path.getsize(z) != total:
                raise OSError('incomplete download')
            break
        except OSError as e:
            print(f'  download try {attempt + 1} failed: {e}', flush=True)
    else:
        raise FileNotFoundError('Could not download the dataset from Google Drive. Attach it instead: Add Input -> '
                                'Datasets -> "498r-bangla-lpr-all-in-one" (or upload the zip from the Drive folder '
                                f'{DRIVE_FOLDER} as a Kaggle dataset).')
    print('  unpacking ...', flush=True)
    with zipfile.ZipFile(z) as f:
        f.extractall(dest)
    os.remove(z)
    root = _search()
    print('dataset ready:', root, flush=True)
    return root


def find_dataset(download=True):
    """The 498R dataset root (folder with dataset_manifest.json): $DATASET_ROOT, an attached Kaggle input, a local copy
    (~/data, /content, ./), else it is downloaded once from the team Google Drive."""
    root = os.environ.get('DATASET_ROOT')
    if root and os.path.exists(os.path.join(root, 'dataset_manifest.json')):
        return _check_version(root)
    root = _search()
    if root:
        return _check_version(root)
    if download and not os.environ.get('LPR_NO_DOWNLOAD'):
        root = download_dataset()
        if root:
            os.environ['DATASET_ROOT'] = root           # jobs started from here inherit it (no second download)
            return _check_version(root)
    raise FileNotFoundError('dataset_manifest.json not found. On Kaggle: Add Input -> "498r-bangla-lpr-all-in-one", '
                            f'or keep Internet on so it downloads from {DRIVE_FOLDER}. Locally: set DATASET_ROOT.')


def data_yaml(part, kind='all', out_dir=None):
    """Copy detection/recognition data(.human).yaml with an absolute `path:` so Ultralytics can read it anywhere."""
    root = find_dataset()
    src = os.path.join(root, part, 'data.yaml' if kind == 'all' else 'data_human.yaml')
    out_dir = out_dir or os.path.join(WORK, 'yaml')
    os.makedirs(out_dir, exist_ok=True)
    lines = open(src, encoding='utf-8').read().splitlines()
    lines = [l for l in lines if not l.startswith('path:') and not l.startswith('#')]
    dst = os.path.join(out_dir, f'{part}_{kind}.yaml')
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(f'path: {os.path.join(root, part)}\n' + '\n'.join(lines) + '\n')
    return dst


def cv2_with_cascade():
    """OpenCV 5 moved the Haar cascades out of the main package; papers #3 and #11 need them. If the installed cv2 has
    no CascadeClassifier, OpenCV 4.x is installed into WORK/opencv4 and imported instead. Call it BEFORE any other
    `import cv2` in the process."""
    probe = subprocess.run([sys.executable, '-c', 'import cv2, sys; sys.exit(0 if hasattr(cv2, "CascadeClassifier") else 1)'])
    if probe.returncode != 0:
        d = os.path.join(WORK, 'opencv4')
        if not os.path.exists(os.path.join(d, 'cv2')):
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--no-deps', '--target', d,
                            'opencv-python-headless<5'], check=True)
        sys.path.insert(0, d)
    import cv2
    assert hasattr(cv2, 'CascadeClassifier'), 'this OpenCV has no Haar cascade support'
    return cv2


def gpu_count():
    try:
        import torch
        return torch.cuda.device_count()
    except Exception:
        return 0


def env_info():
    info = {'python': sys.version.split()[0], 'platform': platform.platform(), 'date': time.strftime('%Y-%m-%d %H:%M')}
    try:
        import torch
        info['torch'] = torch.__version__
        info['cuda'] = torch.version.cuda
        info['gpus'] = [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]
    except Exception:
        pass
    for mod in ('ultralytics', 'transformers', 'numpy', 'cv2', 'onnxruntime', 'tensorrt', 'timm', 'peft'):
        try:
            m = __import__(mod)
            info[mod] = getattr(m, '__version__', '?')
        except Exception:
            pass
    return info


def save_json(obj, path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1, default=str)


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def run_on_gpus(jobs, log_dir=None):
    """jobs: list of (name, gpu_id or None, [cmd...], extra_env dict or None). All start together; returns {name: code}.
    Each job gets CUDA_VISIBLE_DEVICES=<gpu_id>, so inside the job the GPU is always device 0.
    Jobs given the same gpu_id run one after the other on that GPU (a queue per GPU)."""
    log_dir = log_dir or os.path.join(WORK, 'logs')
    os.makedirs(log_dir, exist_ok=True)
    codes = {}

    def start(job):
        name, gpu, cmd, extra = (list(job) + [None])[:4]
        env = dict(os.environ)
        if gpu is not None:
            env['CUDA_VISIBLE_DEVICES'] = str(gpu)
        env.update(extra or {})
        log = open(os.path.join(log_dir, f'{name}.log'), 'w', encoding='utf-8')
        print(f'[start] {name} on GPU {gpu}: {" ".join(map(str, cmd))}', flush=True)
        return subprocess.Popen([str(c) for c in cmd], stdout=log, stderr=subprocess.STDOUT, env=env), log, time.time()

    pending = {}
    for job in jobs:
        pending.setdefault(job[1], []).append(job)
    active = {}
    for g in pending:
        if pending[g]:
            job = pending[g].pop(0)
            active[g] = (job,) + start(job)
    while active:
        time.sleep(10)
        for g in list(active):
            job, proc, log, t0 = active[g]
            if proc.poll() is not None:
                log.close()
                codes[job[0]] = proc.returncode
                print(f'[done]  {job[0]} code={proc.returncode} after {(time.time() - t0) / 60:.1f} min', flush=True)
                del active[g]
                if pending[g]:
                    nxt = pending[g].pop(0)
                    active[g] = (nxt,) + start(nxt)
    return codes


def tail(path, n=20):
    try:
        lines = open(path, encoding='utf-8', errors='replace').read().replace('\r', '\n').splitlines()
        return '\n'.join(l for l in lines if l.strip())[-4000:] if n is None else '\n'.join([l for l in lines if l.strip()][-n:])
    except FileNotFoundError:
        return ''


class Timer:
    def __enter__(self):
        self.t0 = time.time()
        return self

    def __exit__(self, *a):
        self.minutes = (time.time() - self.t0) / 60
