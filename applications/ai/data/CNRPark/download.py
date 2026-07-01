import os
import zipfile
from pathlib import Path
from kaggle.api.kaggle_api_extended import KaggleApi

save_path = Path(__file__).parent / "raw"
save_path.mkdir(parents=True, exist_ok=True)

api = KaggleApi()
api.authenticate()

print("Downloading CNRPark+EXT to:", save_path)
api.dataset_download_files(
    dataset="ddsshubham/cnrpark-ext",
    path=str(save_path),
    unzip=True,
)
print("Done.")
