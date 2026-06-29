import os
from pathlib import Path
from huggingface_hub import snapshot_download

os.environ["HF_XET_HIGH_PERFORMANCE"] = "1"

save_path = Path(__file__).parent / "raw"
save_path.mkdir(parents=True, exist_ok=True)

hf_token = os.environ.get("HF_TOKEN")

# already downloaded files are skipped automatically
print("Downloading PKLot to:", save_path)
snapshot_download(
    repo_id="Voxel51/PKLot",
    repo_type="dataset",
    local_dir=str(save_path),
    token=hf_token,
    max_workers=2, # lower concurrency
)
print("Done.")
