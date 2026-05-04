import subprocess
from pathlib import Path

def extract_audio(input_video: str, output_audio: str):
    """
    Extract original audio from uploaded video.
    Saves as AAC in .m4a container.
    """
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_video,
        "-vn",
        "-acodec", "aac",
        output_audio
    ]
    subprocess.run(cmd, check=True)

def mux_audio_with_video(rendered_video: str, original_audio: str, output_video: str):
    """
    Merge rendered video with original audio.
    """
    cmd = [
        "ffmpeg",
        "-y",
        "-i", rendered_video,
        "-i", original_audio,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-shortest",
        output_video
    ]
    subprocess.run(cmd, check=True)