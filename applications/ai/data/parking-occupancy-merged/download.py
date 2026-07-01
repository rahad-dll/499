# Download the parking-occupancy-merged(CNRPark+PKLot) dataset from Kaggle
# Run: python download.py
# Requires: pip install kagglehub

import kagglehub
from pathlib import Path
import shutil

save_path = Path(__file__).parent / "data"
save_path.mkdir(parents=True, exist_ok=True)

print("Downloading parking-occupancy-merged from Kaggle...")
path = kagglehub.dataset_download("raahad/parking-occupancy-merged")

print(f"Downloaded to cache: {path}")

# Copy from kagglehub cache to local data/ folder
shutil.copytree(path, save_path, dirs_exist_ok=True)

print(f"Done. Files saved to: {save_path}")
print("Structure:")
for split in ["train", "val"]:
    for label in ["occupied", "empty"]:
        folder = save_path / split / label
        if folder.exists():
            n = len(list(folder.glob("*")))
            print(f"  {split}/{label}: {n:,} images")
