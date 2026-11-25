import os
import subprocess
import tkinter as tk
from tkinter import filedialog, messagebox

FFMPEG_PATH = (
    r"C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.1-full_build\bin\ffmpeg.exe"
)

FRAME_INTERVAL_SECONDS = 30


def extract_frames():
    root = tk.Tk()
    root.withdraw()

    if not os.path.isfile(FFMPEG_PATH):
        messagebox.showerror(
            "FFmpeg not found",
            f"Could not find FFmpeg here:\n{FFMPEG_PATH}\n\n"
            "Update FFMPEG_PATH in this script."
        )
        root.destroy()
        return

    videos = filedialog.askopenfilenames(
        title="Select your traffic videos",
        filetypes=[
            ("Video files", "*.mp4 *.mkv *.mov *.avi *.webm"),
            ("All files", "*.*")
        ]
    )
    if not videos:
        root.destroy()
        return

    output_base = filedialog.askdirectory(
        title="Choose where to save extracted images"
    )
    if not output_base:
        root.destroy()
        return

    successful = 0
    failed = []

    for video in videos:
        video_name = os.path.splitext(os.path.basename(video))[0]
        output_folder = os.path.join(output_base, video_name)
        os.makedirs(output_folder, exist_ok=True)
        output_pattern = os.path.join(output_folder, "frame_%04d.jpg")

        command = [
            FFMPEG_PATH,
            "-hide_banner",
            "-loglevel", "error",
            "-i", video,
            "-vf", f"fps=1/{FRAME_INTERVAL_SECONDS}",
            "-q:v", "2",
            output_pattern
        ]

        print(f"Processing: {video_name}")
        try:
            subprocess.run(command, check=True)
            successful += 1
            print(f"Images saved to: {output_folder}")
        except (subprocess.CalledProcessError, OSError) as error:
            failed.append(video_name)
            print(f"Could not process {video_name}: {error}")

    message = (
        f"Completed!\n\nSuccessfully processed: {successful}\n"
        f"Failed: {len(failed)}\n\nSaved images in:\n{output_base}"
    )
    if failed:
        message += "\n\nFailed videos:\n" + "\n".join(failed)

    messagebox.showinfo("Frame extraction complete", message)
    root.destroy()


if __name__ == "__main__":
    extract_frames()
