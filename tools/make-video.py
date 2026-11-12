"""Laver de to Web-AR.Studio-filer ud fra trykket og de renderede billeder.

Brug (fra byens mappe):
    python tools/make-video.py trigger   # web-ar-studio/trigger-<slug>.png (2400 px, hvid baggrund, under 3 MB)
    python tools/make-video.py video     # web-ar-studio/<slug>-ar-magenta.mp4 fra web-ar-studio/frames/
    python tools/make-video.py preview   # web-ar-studio/<slug>-ar-preview.mp4: magenta fjernet over papirfarve,
                                         # så man kan se animationen som i AR (og tjekke for lilla kanter)

Videoen er UDEN lyd med vilje: iPhone starter ikke en video med lyd af sig selv, og så står
animationen stille i App Clip'en. Den er 1152 x 888, H.264 Main, ca. 3-4 MB, så den når at hente.
Kræver Pillow og ffmpeg (winget install Gyan.FFmpeg).
"""
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
slug = re.search(r'slug:\s*"([^"]+)"', open(os.path.join(ROOT, "js", "city.js"), encoding="utf-8").read()).group(1)
OUT = os.path.join(ROOT, "web-ar-studio")
os.makedirs(OUT, exist_ok=True)


def trigger():
    from PIL import Image

    src = os.path.join(ROOT, "print", f"{slug}-print-4800px.png")
    im = Image.open(src)
    bg = Image.new("RGB", im.size, "white")
    bg.paste(im, mask=im.split()[3])
    dst = os.path.join(OUT, f"trigger-{slug}.png")
    bg.resize((2400, 1800), Image.LANCZOS).save(dst, optimize=True)
    kb = os.path.getsize(dst) // 1024
    print(f"{dst}  ({kb} KB)" + ("  ADVARSEL: over 3 MB" if kb > 3000 else ""))


def video():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        sys.exit("ffmpeg mangler. Installer med:  winget install Gyan.FFmpeg")
    frames = os.path.join(OUT, "frames", "f%04d.png")
    dst = os.path.join(OUT, f"{slug}-ar-magenta.mp4")
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-framerate", "30", "-i", frames, "-an",
        "-vf", "scale=1152:888:flags=lanczos", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "22",
        "-preset", "slow", "-profile:v", "main", "-level", "4.0", "-movflags", "+faststart", dst,
    ]
    subprocess.run(cmd, check=True)
    print(f"{dst}  ({os.path.getsize(dst) // 1024} KB)")


def preview():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        sys.exit("ffmpeg mangler. Installer med:  winget install Gyan.FFmpeg")
    src = os.path.join(OUT, f"{slug}-ar-magenta.mp4")
    if not os.path.exists(src):
        sys.exit("Lav videoen først:  python tools/make-video.py video")
    dst = os.path.join(OUT, f"{slug}-ar-preview.mp4")
    cmd = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", src,
        "-f", "lavfi", "-i", "color=c=0xEEE5D2:s=1152x888:r=30",
        "-filter_complex", "[0:v]colorkey=0xFF00FF:0.32:0.08[k];[1:v][k]overlay=shortest=1",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-movflags", "+faststart", dst,
    ]
    subprocess.run(cmd, check=True)
    print(f"{dst}  ({os.path.getsize(dst) // 1024} KB)")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else ""
    if what == "trigger":
        trigger()
    elif what == "video":
        video()
    elif what == "preview":
        preview()
    else:
        sys.exit("Brug: python tools/make-video.py trigger|video|preview")
